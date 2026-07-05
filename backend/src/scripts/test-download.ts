import supabase from '../config/supabase';

async function main() {
  const fileToDownload = 'signatures/03ee37f7-6c1a-4a04-b3ab-138362bd3500.jpg';
  console.log('Downloading from hrms-documents...');
  const res1 = await supabase.storage.from('hrms-documents').download(fileToDownload);
  console.log('hrms-documents response:', res1.error);

  console.log('Downloading from employees...');
  const res2 = await supabase.storage.from('employees').download(fileToDownload);
  console.log('employees response:', res2.error);

  console.log('Downloading from documents...');
  const res3 = await supabase.storage.from('documents').download(fileToDownload);
  console.log('documents response:', res3.error);
}

main().catch(console.error);
