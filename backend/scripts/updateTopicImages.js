const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateImages() {
  const topicsDir = path.join(__dirname, '../../frontend/public/images/topics');
  const files = fs.readdirSync(topicsDir);

  const topics = await prisma.topic.findMany();
  let updatedCount = 0;

  for (const topic of topics) {
    const nameWithoutParen = topic.name.replace(/\s*\(.*?\)/, '').trim();
    
    let matchedFile = null;
    for (const file of files) {
      const baseName = path.parse(file).name;
      if (baseName === topic.name || baseName === nameWithoutParen) {
        matchedFile = file;
        break;
      }
    }

    if (matchedFile) {
      await prisma.topic.update({
        where: { id: topic.id },
        data: { imageUrl: `/images/topics/${matchedFile}` }
      });
      updatedCount++;
      console.log(`Updated ${topic.name} -> /images/topics/${matchedFile}`);
    } else {
      console.log(`No image found for topic: ${topic.name}`);
    }
  }

  console.log(`Done! Updated ${updatedCount} out of ${topics.length} topics.`);
}

updateImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
