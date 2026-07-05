import supabase from '../config/supabase';

async function main() {
  const path = 'aef89c43-7069-4bae-bca3-fc6b35ba485c/documents/partial_offer_letter_1782747731597.docx';
  const { data, error } = await supabase.storage.from('hrms-documents').createSignedUrl(path, 3600);
  console.log('Result:', data, error);
}

main().catch(console.error);
