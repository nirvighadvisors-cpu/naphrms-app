import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export const deleteFileFromSupabase = async (fileUrl: string) => {
  try {
    if (!fileUrl.includes('/public/documents/')) return;
    const filePath = fileUrl.split('/public/documents/')[1];
    if (filePath) {
      const { error } = await supabase.storage.from('documents').remove([filePath]);
      if (error) console.error('Failed to delete file from Supabase storage:', error);
    }
  } catch (err) {
    console.error('Error deleting from Supabase:', err);
  }
};
