const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Match img tags and replace src if it's a profile image
  // We'll use a regex that matches <img ...>
  let updated = false;
  content = content.replace(/<img([^>]*?)>/gi, (imgTag) => {
    // Check if the img tag is a profile image by looking at data-alt or alt
    const isProfile = /headshot|portrait|profile\s+picture|Sarthak/i.test(imgTag);
    // Ensure we don't accidentally match logo or random urban issue images
    const isLogo = /logo/i.test(imgTag);
    const isIssue = /pothole|trash|garbage|water|leak|lamp|street|cracked/i.test(imgTag);

    if (isProfile && !isLogo && !isIssue) {
      // Replace src="..." with src="profile_photo.jpg"
      // Also clean up any data-alt/alt to match the new photo
      let newTag = imgTag.replace(/src="[^"]*?"/gi, 'src="profile_photo.jpg"');
      updated = true;
      return newTag;
    }
    return imgTag;
  });

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated profile photo in ${file}`);
  }
});
