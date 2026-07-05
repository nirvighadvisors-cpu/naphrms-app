import supabase from '../config/supabase';

async function main() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error);
  } else {
    console.log('Buckets:');
    console.log(data);
  }
}

main().catch(console.error);
