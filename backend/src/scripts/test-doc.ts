import { OfferLetterService } from '../modules/onboarding/offer-letter.service';

async function main() {
  try {
    const url = await OfferLetterService.generateAndUploadPartial('aef89c43-7069-4bae-bca3-fc6b35ba485c');
    console.log('Success! URL:', url);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
