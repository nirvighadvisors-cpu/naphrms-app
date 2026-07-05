import { createClient } from '@supabase/supabase-js';
import { config } from './env';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

export default supabase;
