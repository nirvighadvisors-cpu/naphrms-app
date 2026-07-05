import supabase from '../config/supabase';

async function main() {
  const { data, error } = await supabase.storage.from('hrms-documents').list('aef89c43-7069-4bae-bca3-fc6b35ba485c/documents');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Files:', data);
  }
}

main().catch(console.error);
