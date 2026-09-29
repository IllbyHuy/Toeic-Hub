const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const contentPath = 'C:/Users/dokha/.gemini/antigravity-ide/brain/4cb3b6cc-5676-41f0-b34a-6dbedda4a707/.system_generated/steps/1901/content.md';
const content = fs.readFileSync(contentPath, 'utf8');

function cleanHtml(str) {
  return str.replace(/<[^>]*>?/gm, '').trim();
}

async function scrapeElsaAndSeed() {
  console.log('Bắt đầu phân tích dữ liệu từ ELSA Speak...');
  
  // Lấy các phần chia theo h3 (Chủ đề)
  const parts = content.split(/<h3 class="wp-block-heading">/g);
  
  const topicsData = [];

  // Bắt đầu từ phần tử thứ 1 vì phần 0 là phần mở đầu (trước h3 đầu tiên)
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    // Lấy tên chủ đề
    const topicMatch = part.match(/<span id=".*?">(.*?)<\/span><\/h3>/);
    if (!topicMatch) continue;
    
    const topicName = cleanHtml(topicMatch[1]);
    
    // Nếu nó không phải là một trong các chủ đề (kiểu như không có tiếng Anh trong ngoặc)
    // Các chủ đề TOEIC thường có dạng "Hợp đồng (Contracts)"
    if (!topicName.includes('(')) continue;

    const words = [];
    
    // Tìm các thẻ <tr>
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let trMatch;
    while ((trMatch = trRegex.exec(part)) !== null) {
      const trContent = trMatch[1];
      
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      const tds = [];
      let tdMatch;
      while ((tdMatch = tdRegex.exec(trContent)) !== null) {
        tds.push(cleanHtml(tdMatch[1]));
      }
      
      // Cấu trúc bảng của ELSA: 1: Từ vựng, 2: Phiên âm, 3: Nghĩa
      if (tds.length === 3) {
        const rawWord = tds[0];
        // Bỏ qua hàng tiêu đề
        if (rawWord.toLowerCase().includes('từ vựng')) continue;
        
        let word = rawWord;
        let type = '';
        
        // Tách loại từ nếu có (vd: agreement (n))
        const typeMatch = rawWord.match(/(.*?)\s+(\(.*?\))/);
        if (typeMatch) {
          word = typeMatch[1].trim();
          type = typeMatch[2].trim();
        }

        const pronunciation = tds[1];
        const meaning = tds[2];
        
        words.push({
          word,
          type,
          pronunciation,
          meaning,
          example: `This is a sample sentence for "${word}".` // Dummy example
        });
      }
    }
    
    if (words.length > 0) {
      topicsData.push({
        name: topicName,
        description: `Chủ đề luyện thi TOEIC từ ELSA Speak: ${topicName}`,
        imageUrl: `https://picsum.photos/seed/${topicsData.length}/400/300`, // random image
        words
      });
    }
  }

  console.log(`Tìm thấy ${topicsData.length} chủ đề, chuẩn bị insert vào DB...`);
  
  if (topicsData.length === 0) {
    console.log("Không tìm thấy từ vựng nào! Vui lòng kiểm tra lại cấu trúc cạo dữ liệu.");
    return;
  }

  // Xóa cũ
  console.log('Xóa dữ liệu cũ...');
  await prisma.userVocabProgress.deleteMany({});
  await prisma.systemVocab.deleteMany({});
  await prisma.topic.deleteMany({});

  let totalWords = 0;
  for (const t of topicsData) {
    const createdTopic = await prisma.topic.create({
      data: {
        name: t.name,
        description: t.description,
        imageUrl: t.imageUrl,
      }
    });

    const vocabData = t.words.map(w => ({
      topicId: createdTopic.id,
      word: w.word,
      pronunciation: w.pronunciation,
      type: w.type,
      meaning: w.meaning,
      example: w.example,
    }));

    await prisma.systemVocab.createMany({
      data: vocabData
    });
    totalWords += vocabData.length;
    console.log(`- Đã thêm chủ đề: ${t.name} (${vocabData.length} từ)`);
  }

  console.log(`\n🎉 THÀNH CÔNG! Đã chèn tổng cộng ${topicsData.length} chủ đề và ${totalWords} từ vựng vào Database.`);
}

scrapeElsaAndSeed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
