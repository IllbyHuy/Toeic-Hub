const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const imageDir = path.join(__dirname, '../../frontend/public/images/topics');
  const files = fs.readdirSync(imageDir);

  const topics = await prisma.topic.findMany();

  for (const topic of topics) {
    // Find a matching file
    // Example topic name: "Tiếp thị (Marketing)", "Hợp đồng (Contracts)"
    // Example file name: "Tiếp thị.webp", "Hợp đồng.jpg", "Báo cáo tài chính (Financial statements).jpg"
    
    // We clean up names for comparison
    const cleanTopicName = topic.name.split(' (')[0].trim().toLowerCase();

    let matchedFile = files.find(f => {
      const cleanFileName = path.parse(f).name.split(' (')[0].trim().toLowerCase();
      return cleanFileName === cleanTopicName || f.toLowerCase().includes(cleanTopicName) || cleanTopicName.includes(cleanFileName);
    });

    if (matchedFile) {
      const imageUrl = '/images/topics/' + matchedFile;
      console.log(`Matched topic "${topic.name}" to "${matchedFile}"`);
      await prisma.topic.update({
        where: { id: topic.id },
        data: { imageUrl }
      });
    } else {
      console.log(`No match for topic "${topic.name}"`);
    }
  }

  const totalWords = await prisma.systemVocab.count();
  console.log('Total system words:', totalWords);
}

main().catch(console.error).finally(() => prisma.$disconnect());
