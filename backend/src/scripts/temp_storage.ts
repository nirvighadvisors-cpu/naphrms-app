import supabase from '../config/supabase';

async function listFiles(folder: string) {
  const { data, error } = await supabase.storage.from('hrms-documents').list(folder);
  if (error) {
    console.error(`Error listing ${folder}:`, error);
  } else {
    console.log(`Files in ${folder}:`, data);
  }
}

async function main() {
  await listFiles('payslips');
  await listFiles('offer-letters');
  await listFiles('policy-documents');
}

main().catch(console.error);
