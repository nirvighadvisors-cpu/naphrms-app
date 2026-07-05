import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePunchIn, usePunchOut, useExtendPunchOut } from '../api/use-attendance';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, Clock, MapPin, MapPinOff, Loader2, Timer, AlarmClockPlus, AlertCircle } from 'lucide-react';
import type { AttendanceRecord } from '../api/attendance-api';
import { cn } from '@/lib/utils';
import { formatInTimeZone } from 'date-fns-tz';
import { usePWA } from '@/hooks/use-pwa';
import { LiveCameraCapture } from './live-camera-capture';

interface PunchClockProps {
  todayRecord: AttendanceRecord | null;
}

export const PunchClock: React.FC<PunchClockProps> = ({ todayRecord }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [actionType, setActionType] = useState<'IN' | 'OUT' | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{lat: number; lng: number} | null>(null);
  
  const punchInMutation = usePunchIn();
  const punchOutMutation = usePunchOut();
  const extendMutation = useExtendPunchOut();
  const { toast } = useToast();
  const { isOnline } = usePWA();

  const isPunchedIn = !!todayRecord?.punchInTime;
  const isPunchedOut = !!todayRecord?.punchOutTime;
  const isWorking = isPunchedIn && !isPunchedOut;
  const isAutoPunched = todayRecord?.isAutoPunchedOut;

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Elapsed time counter — resumes from server punchInTime
  useEffect(() => {
    if (!isWorking || !todayRecord?.punchInTime) return;

    const updateElapsed = () => {
      const start = new Date(todayRecord.punchInTime!).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateElapsed(); // run immediately so there's no 1s delay
    const timer = setInterval(updateElapsed, 1000);
    
    return () => clearInterval(timer);
  }, [isWorking, todayRecord?.punchInTime]);

  const handleAction = () => {
    setIsGettingLocation(true);
    
    if (navigator.geolocation) {
      const getPos = (options: PositionOptions) => {
        return new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
      };

      const fetchLocation = async () => {
        try {
          return await getPos({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
        } catch (err: any) {
          if (err.code === 3 || err.code === 2) {
            console.warn("High accuracy failed, trying low accuracy...");
            return await getPos({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
          }
          throw err;
        }
      };

      fetchLocation()
        .then((position) => {
          setIsGettingLocation(false);
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setPendingCoords(coords);
          setActionType(!isPunchedIn ? 'IN' : 'OUT');
          setIsCameraOpen(true);
        })
        .catch((error) => {
          setIsGettingLocation(false);
          console.warn("Geolocation error:", error);
          let title = "Location Error";
          let desc = "Could not determine your location.";
          if (error.code === 1) {
            title = "Location Permission Denied";
            desc = "Please allow location access in your browser to punch in.";
          } else if (error.code === 3) {
            title = "Location Timeout";
            desc = "Location request timed out. Please try again.";
          }
          toast({
            title: title,
            description: desc,
            variant: "destructive"
          });
        });
    } else {
      setIsGettingLocation(false);
      toast({
        title: "Unsupported Browser",
        description: "Your browser does not support location services.",
        variant: "destructive"
      });
    }
  };

  const isLoading = isGettingLocation || punchInMutation.isPending || punchOutMutation.isPending;

  // Format auto-punch-out deadline for display
  const getDeadlineDisplay = () => {
    if (!todayRecord?.autoPunchOutTime) return null;
    return formatInTimeZone(new Date(todayRecord.autoPunchOutTime), 'Asia/Kolkata', 'hh:mm a');
  };

  const handleCameraConfirm = (base64Image: string) => {
    setIsCameraOpen(false);
    if (!pendingCoords || !actionType) return;
    
    const payload = { ...pendingCoords, photoBase64: base64Image };
    
    if (actionType === 'IN') {
      punchInMutation.mutate(payload);
    } else {
      punchOutMutation.mutate(payload);
    }
    
    setPendingCoords(null);
    setActionType(null);
  };

  return (
    <Card className="overflow-hidden border-border shadow-card bg-surface relative">
      <div className={cn(
        "absolute top-0 left-0 w-full h-1 transition-colors duration-500",
        !isPunchedIn ? "bg-success" : isWorking ? "bg-warning" : "bg-primary"
      )} />
      
      <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Left Side: Info & Timeline */}
        <div className="flex-1 space-y-6">
          {!isOnline && (
            <Alert variant="destructive" className="border-error/50 bg-error/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Offline</AlertTitle>
              <AlertDescription>
                You have lost internet connection. The punch clock is disabled to ensure accurate time tracking.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <p className="text-text-muted font-medium mb-1">
              {formatInTimeZone(currentTime, 'Asia/Kolkata', 'EEEE, MMMM do, yyyy')}
            </p>
            <h2 className="text-5xl font-display font-semibold text-text tabular-nums tracking-tight">
              {formatInTimeZone(currentTime, 'Asia/Kolkata', 'hh:mm a')}
            </h2>
          </div>

          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <div className="bg-bg rounded-lg p-3 border border-border min-w-[140px]">
              <p className="text-xs text-text-muted mb-1 flex items-center justify-center md:justify-start gap-1">
                <Clock className="w-3 h-3" /> Punch In
              </p>
              <p className="font-medium text-text">
                {todayRecord?.punchInTime ? formatInTimeZone(new Date(todayRecord.punchInTime), 'Asia/Kolkata', 'hh:mm a') : '--:--'}
              </p>
            </div>
            
            <div className="bg-bg rounded-lg p-3 border border-border min-w-[140px]">
              <p className="text-xs text-text-muted mb-1 flex items-center justify-center md:justify-start gap-1">
                <Clock className="w-3 h-3" /> Punch Out
              </p>
              <p className="font-medium text-text">
                {todayRecord?.punchOutTime ? formatInTimeZone(new Date(todayRecord.punchOutTime), 'Asia/Kolkata', 'hh:mm a') : '--:--'}
              </p>
              {isAutoPunched && (
                <p className="text-xs text-warning mt-0.5 font-medium">Auto-punched out</p>
              )}
            </div>

            {/* Auto-Punch-Out Deadline */}
            {isWorking && getDeadlineDisplay() && (
              <div className="bg-bg rounded-lg p-3 border border-warning/30 min-w-[140px]">
                <p className="text-xs text-warning mb-1 flex items-center justify-center md:justify-start gap-1">
                  <Timer className="w-3 h-3" /> Auto Punch-Out
                </p>
                <p className="font-medium text-warning">{getDeadlineDisplay()}</p>
              </div>
            )}
          </div>

          {/* Extend Time Buttons (shown only when working) */}
          {isWorking && (
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <p className="w-full text-xs text-text-muted mb-1 flex items-center gap-1">
                <AlarmClockPlus className="w-3 h-3" /> Need more time?
              </p>
              <Button
                size="sm"
                variant="outline"
                className="border-warning/30 text-warning hover:bg-warning/10 hover:text-warning"
                onClick={() => extendMutation.mutate({ extensionMinutes: 30 })}
                disabled={extendMutation.isPending}
              >
                {extendMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                +30 min
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-warning/30 text-warning hover:bg-warning/10 hover:text-warning"
                onClick={() => extendMutation.mutate({ extensionMinutes: 60 })}
                disabled={extendMutation.isPending}
              >
                +1 hour
              </Button>
            </div>
          )}
        </div>

        {/* Right Side: The Button */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="relative group">
            {/* Outer animated ring for 'Working' state */}
            {isWorking && (
              <div className="absolute -inset-4 rounded-full border-2 border-warning/30 animate-[spin_4s_linear_infinite]" />
            )}
            
            <button
              onClick={handleAction}
              disabled={isLoading || isPunchedOut || !isOnline}
              className={cn(
                "relative flex flex-col items-center justify-center w-48 h-48 rounded-full shadow-elevated transition-all duration-300 transform group-hover:scale-[1.02] group-active:scale-95 disabled:pointer-events-none disabled:opacity-90 overflow-hidden",
                !isPunchedIn 
                  ? "bg-gradient-to-br from-success/90 to-[#2c5315] hover:from-success hover:to-[#37681a]" 
                  : isWorking
                    ? "bg-gradient-to-br from-warning/90 to-[#6a2d10] hover:from-warning hover:to-[#823714]"
                    : "bg-surface-offset border border-border shadow-none"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              ) : !isPunchedIn ? (
                <>
                  <Fingerprint className="w-12 h-12 text-white mb-2" />
                  <span className="text-white font-display font-medium text-xl">Punch In</span>
                </>
              ) : isWorking ? (
                <>
                  <span className="text-warning-foreground font-display font-medium text-xl mb-1">Punch Out</span>
                  <span className="text-white font-display font-semibold text-2xl tabular-nums tracking-wide">
                    {elapsedTime}
                  </span>
                </>
              ) : (
                <>
                  <MapPinOff className="w-10 h-10 text-text-muted mb-2" />
                  <span className="text-text font-display font-medium text-lg">Day Complete</span>
                  {todayRecord?.workHours && (
                    <span className="text-sm text-text-muted mt-1">{todayRecord.workHours.toFixed(2)} hrs logged</span>
                  )}
                  {isAutoPunched && (
                    <span className="text-xs text-warning mt-1 font-medium">Auto-punched</span>
                  )}
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-text-muted mt-6 flex items-center gap-1.5">
            {isGettingLocation ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Acquiring GPS...</>
            ) : !isPunchedIn || isWorking ? (
              <><MapPin className="w-3 h-3" /> Location required for verification</>
            ) : (
              "Have a good rest!"
            )}
          </p>
        </div>

      </CardContent>

      {/* Live Camera Modal */}
      <LiveCameraCapture
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          setPendingCoords(null);
          setActionType(null);
        }}
        onConfirm={handleCameraConfirm}
        title={actionType === 'IN' ? 'Punch In - Photo Capture' : 'Punch Out - Photo Capture'}
      />
    </Card>
  );
};
