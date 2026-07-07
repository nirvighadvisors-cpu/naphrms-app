import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:gap-4 md:flex-row md:items-start md:justify-between mb-6 sm:mb-8', className)}>
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex flex-row flex-nowrap items-center overflow-x-auto whitespace-nowrap scrollbar-none gap-1 text-xs sm:text-sm text-text-muted mb-1.5 sm:mb-2 pb-1">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={crumb.label} className="flex flex-row items-center whitespace-nowrap flex-shrink-0">
                  {crumb.href && !isLast ? (
                    <Link
                      to={crumb.href}
                      className="hover:text-primary transition-colors flex items-center h-full"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-text font-medium' : ''}>
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mx-0.5 sm:mx-1 flex-shrink-0" />}
                </div>
              );
            })}
          </nav>
        )}
        <h1 className="text-page-title text-text">{title}</h1>
        {description && (
          <p className="mt-1 text-xs sm:text-body text-text-muted">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3 flex-wrap w-full md:w-auto mt-2 md:mt-0">
          {action}
        </div>
      )}
    </div>
  );
}
