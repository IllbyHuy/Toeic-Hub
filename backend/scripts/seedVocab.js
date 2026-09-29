const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const topicsData = [
  {
    name: "Contracts",
    description: "Từ vựng về Hợp đồng",
    imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=500&q=60",
    words: [
      {
        word: "abide by",
        pronunciation: "/əˈbaɪd baɪ/",
        type: "verb",
        meaning: "tuân thủ",
        example: "The two parties agreed to abide by the judge's decision."
      },
      {
        word: "agreement",
        pronunciation: "/əˈɡriːmənt/",
        type: "noun",
        meaning: "hợp đồng, sự thỏa thuận",
        example: "According to the agreement, the caterer will also supply the flowers for the event."
      },
      {
        word: "assurance",
        pronunciation: "/əˈʃʊərəns/",
        type: "noun",
        meaning: "sự bảo đảm",
        example: "The sales associate gave his assurance that the missing keyboard would be replaced the next day."
      },
      {
        word: "cancellation",
        pronunciation: "/ˌkænsəˈleɪʃn/",
        type: "noun",
        meaning: "sự hủy bỏ",
        example: "The cancellation of her flight caused her problems for the rest of the week."
      },
      {
        word: "determine",
        pronunciation: "/dɪˈtɜːrmɪn/",
        type: "verb",
        meaning: "quyết định, xác định",
        example: "After reading the contract, I was still unable to determine if our company was liable for back wages."
      }
    ]
  },
  {
    name: "Marketing",
    description: "Từ vựng về Tiếp thị",
    imageUrl: "https://images.unsplash.com/photo-1533750516457-a7f992034fec?auto=format&fit=crop&w=500&q=60",
    words: [
      {
        word: "attract",
        pronunciation: "/əˈtrækt/",
        type: "verb",
        meaning: "thu hút",
        example: "The new advertising attracts the wrong kind of customer into the store."
      },
      {
        word: "compare",
        pronunciation: "/kəmˈpeər/",
        type: "verb",
        meaning: "so sánh",
        example: "Once the customer compared the two products, her choice was easy."
      },
      {
        word: "competition",
        pronunciation: "/ˌkɒmpəˈtɪʃn/",
        type: "noun",
        meaning: "sự cạnh tranh",
        example: "In the competition for afternoon diners, Hector's has come out on top."
      },
      {
        word: "consume",
        pronunciation: "/kənˈsuːm/",
        type: "verb",
        meaning: "tiêu thụ",
        example: "The business plans consumed all of Fritz's attention this fall."
      },
      {
        word: "convince",
        pronunciation: "/kənˈvɪns/",
        type: "verb",
        meaning: "thuyết phục",
        example: "The salesman convinced his customer to buy his entire inventory of pens."
      }
    ]
  },
  {
    name: "Warranties",
    description: "Từ vựng về Bảo hành",
    imageUrl: "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?auto=format&fit=crop&w=500&q=60",
    words: [
      {
        word: "characteristic",
        pronunciation: "/ˌkærəktəˈrɪstɪk/",
        type: "noun",
        meaning: "đặc điểm",
        example: "The cooking pot has features characteristic of the brand, such as heat-resistant handles."
      },
      {
        word: "consequence",
        pronunciation: "/ˈkɒnsɪkwəns/",
        type: "noun",
        meaning: "hậu quả",
        example: "The consequence of not following the service instructions for your car is that the warranty is invalidated."
      },
      {
        word: "consider",
        pronunciation: "/kənˈsɪdər/",
        type: "verb",
        meaning: "cân nhắc",
        example: "After considering all the options, Della decided to buy a used car."
      },
      {
        word: "cover",
        pronunciation: "/ˈkʌvər/",
        type: "verb",
        meaning: "bao gồm, chi trả",
        example: "Will my medical insurance cover this surgery?"
      },
      {
        word: "expiration",
        pronunciation: "/ˌekspəˈreɪʃn/",
        type: "noun",
        meaning: "sự hết hạn",
        example: "Have you checked the expiration date on this yogurt?"
      }
    ]
  }
];

async function main() {
  console.log('Bắt đầu thêm dữ liệu mẫu cho Kho 3000 từ vựng...');

  // Delete existing to avoid duplicates in this simple script
  await prisma.systemVocab.deleteMany();
  await prisma.topic.deleteMany();

  for (const topicData of topicsData) {
    const topic = await prisma.topic.create({
      data: {
        name: topicData.name,
        description: topicData.description,
        imageUrl: topicData.imageUrl,
        words: {
          create: topicData.words.map(w => ({
            word: w.word,
            pronunciation: w.pronunciation,
            type: w.type,
            meaning: w.meaning,
            example: w.example
          }))
        }
      }
    });
    console.log(`Đã thêm Topic: ${topic.name} với ${topicData.words.length} từ vựng.`);
  }

  console.log('✅ Chạy seeder thành công!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
