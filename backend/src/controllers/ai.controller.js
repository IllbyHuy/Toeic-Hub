const { GoogleGenAI } = require('@google/genai');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const prisma = require('../config/prisma');

// Khởi tạo SDK Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.explainPost = async (req, res, next) => {
  try {
    const { postId, userPrompt } = req.body;
    const userId = req.user.id;

    if (!postId) {
      throw new ApiError(400, 'Thiếu postId để AI giải thích.');
    }

    // 1. Lấy thông tin bài viết từ DB
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new ApiError(404, 'Không tìm thấy bài viết này.');
    }

    // 2. Chuẩn bị Prompt siêu cấp để hướng dẫn AI đóng vai giáo viên TOEIC
    let basePrompt = `
Bạn là một giáo viên chuyên luyện thi TOEIC (Toeic-Hub Master).
Nhiệm vụ của bạn là giải thích chi tiết, ngắn gọn và dễ hiểu cho câu hỏi TOEIC sau đây.
Nếu đây là một câu hỏi trắc nghiệm ngữ pháp, hãy phân tích tại sao đáp án lại chọn từ loại đó, cấu trúc câu là gì.

Thông tin bài viết:
- Chủ đề/Phần thi: ${post.part}
- Tiêu đề: ${post.title}
- Nội dung câu hỏi: ${post.content}
`;

    if (userPrompt) {
      basePrompt += `\nHọc sinh có thắc mắc cụ thể như sau: "${userPrompt}"\nHãy tập trung trả lời thắc mắc này của học sinh.`;
    } else {
      basePrompt += `\nHãy giải thích tổng quan về ngữ pháp và từ vựng của câu hỏi này.`;
    }

    const parts = [
      { text: basePrompt }
    ];

    // Nếu có ảnh, tải ảnh về dạng base64 để Gemini đọc được ảnh (OCR cực xịn)
    if (post.imageUrl) {
      try {
        const imgRes = await fetch(post.imageUrl);
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        parts.push({
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: imgRes.headers.get('content-type') || 'image/jpeg'
          }
        });
      } catch (err) {
        console.error('Không thể tải ảnh cho AI:', err);
        // Vẫn tiếp tục chạy nếu lỗi tải ảnh
      }
    }

    // 3. Gọi Google Gemini API
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: parts,
    });

    const aiExplanation = response.text;

    return ApiResponse.success(res, 'AI đã giải thích thành công!', {
      explanation: aiExplanation
    });
  } catch (error) {
    console.error('Gemini AI Error:', error);
    next(new ApiError(500, 'Lỗi hệ thống AI. Vui lòng kiểm tra lại cấu hình API Key hoặc chờ giây lát.'));
  }
};

// ============================================================
// AI Dictionary - Tra từ thông minh
// ============================================================
exports.dictionaryLookup = async (req, res, next) => {
  try {
    const { word } = req.body;
    if (!word) throw new ApiError(400, 'Vui lòng nhập từ cần tra');

    const prompt = `
Bạn là từ điển Anh-Việt thông minh. Hãy phân tích từ "${word}".
NẾU NGƯỜI DÙNG NHẬP SAI CHÍNH TẢ (typo), hãy tự động sửa thành từ đúng nhất trong tiếng Anh.
Trả về kết quả dưới dạng JSON (CHỈNH XÁC JSON, không có markdown text bọc ngoài):
{
  "originalWord": "${word}",
  "word": "từ đã được sửa lỗi chính tả (hoặc giữ nguyên nếu đã đúng)",
  "isCorrected": true/false (true nếu bạn đã sửa lỗi chính tả),
  "didYouMean": "gợi ý khác nếu có (hoặc null)",
  "phonetic": "phiên âm IPA",
  "partOfSpeech": "loại từ (noun, verb, adj...)",
  "meaning": "nghĩa tiếng Việt đầy đủ",
  "wordForms": [
    { "type": "noun", "word": "...", "meaning": "..." },
    { "type": "verb", "word": "...", "meaning": "..." },
    { "type": "adjective", "word": "...", "meaning": "..." },
    { "type": "adverb", "word": "...", "meaning": "..." }
  ],
  "synonyms": ["từ đồng nghĩa 1", "từ đồng nghĩa 2"],
  "examples": [
    "Câu ví dụ 1 bằng tiếng Anh (BẮT BUỘC viết dưới dạng câu TOEIC Part 5/6, mang ngữ cảnh kinh doanh, công sở)",
    "Câu ví dụ 2 bằng tiếng Anh (BẮT BUỘC viết dưới dạng câu TOEIC Part 5/6, mang ngữ cảnh kinh doanh, công sở)"
  ]
}
Lưu ý: Chỉ trả về wordForms nào thực sự tồn tại.
Chỉ trả về JSON thuần, KHÔNG kèm giải thích thêm.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
    });

    let parsed;
    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('No JSON block found');
      }
    } catch (parseErr) {
      console.error('JSON Parse Error:', parseErr, response.text);
      return ApiResponse.success(res, 'Tra từ một phần thành công', {
        word: word,
        isCorrected: false,
        meaning: response.text,
        wordForms: [],
        synonyms: [],
        examples: []
      });
    }

    return ApiResponse.success(res, 'Tra từ thành công', parsed);
  } catch (error) {
    console.error('Dictionary Error:', error);
    next(new ApiError(500, 'Lỗi khi tra từ: ' + error.message));
  }
};

// ============================================================
// AI Quiz - Tạo câu hỏi trắc nghiệm từ từ vựng
// ============================================================
exports.generateQuiz = async (req, res, next) => {
  try {
    const { word } = req.body;
    if (!word) throw new ApiError(400, 'Vui lòng cung cấp từ vựng');

    const prompt = `
Tạo 1 câu hỏi trắc nghiệm kiểm tra nghĩa/cách dùng của từ "${word}" trong ngữ cảnh TOEIC.
Trả về JSON (CHÍNH XÁC, không markdown):
{
  "question": "Câu hỏi bằng tiếng Anh (fill in the blank hoặc choose the correct meaning)",
  "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
  "correctIndex": 0,
  "explanation": "Giải thích vì sao đáp án đúng bằng tiếng Việt"
}
Chỉ trả về JSON thuần.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
    });

    let parsed;
    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('No JSON block found');
      }
    } catch (parseErr) {
      console.error('JSON Parse Error:', parseErr, response.text);
      return ApiResponse.success(res, 'OK', {
        question: `Từ "${word}" có nghĩa là gì?`,
        options: ['Loading...'],
        correctIndex: 0,
        explanation: response.text
      });
    }

    return ApiResponse.success(res, 'Quiz created', parsed);
  } catch (error) {
    console.error('Quiz Error:', error);
    next(new ApiError(500, 'Lỗi khi tạo quiz'));
  }
};

// ============================================================
// AI Check Sentence - Kiểm tra câu đặt bởi user
// ============================================================
exports.checkSentence = async (req, res, next) => {
  try {
    const { sentence, word } = req.body;
    if (!sentence) throw new ApiError(400, 'Vui lòng nhập câu cần kiểm tra');

    const prompt = `
Bạn là giáo viên tiếng Anh chuyên TOEIC. Kiểm tra câu sau của học sinh:
"${sentence}"
${word ? `(Họ đang luyện tập từ vựng: "${word}")` : ''}

Trả về JSON (CHÍNH XÁC, không markdown):
{
  "isCorrect": true/false,
  "feedback": "Nhận xét chi tiết bằng tiếng Việt. Nếu sai, hãy chỉ ra lỗi cụ thể và đưa ra câu sửa đúng. Nếu đúng, khen ngợi và giải thích thêm."
}
Chỉ trả về JSON thuần.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
    });

    let parsed;
    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('No JSON block found');
      }
    } catch (parseErr) {
      console.error('JSON Parse Error:', parseErr, response.text);
      return ApiResponse.success(res, 'OK', {
        isCorrect: false,
        feedback: response.text
      });
    }

    return ApiResponse.success(res, 'Checked', parsed);
  } catch (error) {
    console.error('Check Sentence Error:', error);
    next(new ApiError(500, 'Lỗi khi kiểm tra câu'));
  }
};

// ============================================================
// AI Grammar Lookup - Nhờ AI giải thích ngữ pháp
// ============================================================
exports.grammarLookup = async (req, res, next) => {
  try {
    const { topic } = req.body;
    if (!topic) throw new ApiError(400, 'Vui lòng nhập chủ đề ngữ pháp');

    const prompt = `
Bạn là chuyên gia TOEIC. Giải thích chủ đề ngữ pháp "${topic}".
Trả về JSON (CHÍNH XÁC, không markdown text):
{
  "title": "Tiêu đề ngắn gọn (vd: Cách dùng câu điều kiện loại 2)",
  "structure": "Công thức / Quy tắc chính (ngắn gọn, vd: If + S + V(quá khứ), S + would + V)",
  "description": "Giải thích chi tiết cách dùng và mẹo làm bài thi TOEIC liên quan đến chủ đề này",
  "examples": [
    "Ví dụ 1 bằng tiếng Anh -> giải nghĩa",
    "Ví dụ 2 bằng tiếng Anh -> giải nghĩa"
  ]
}
Chỉ trả về JSON thuần.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
    });

    let parsed;
    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('No JSON block found');
      }
    } catch (parseErr) {
      console.error('JSON Parse Error:', parseErr, response.text);
      return ApiResponse.success(res, 'OK', {
        title: topic,
        structure: 'Loading...',
        description: response.text,
        examples: []
      });
    }

    return ApiResponse.success(res, 'Grammar found', parsed);
  } catch (error) {
    console.error('Grammar Lookup Error:', error);
    next(new ApiError(500, 'Lỗi khi tra cứu ngữ pháp'));
  }
};

// ============================================================
// AI Generate Exercises - Tạo bài tập từ sổ tay
// ============================================================
exports.generateExercises = async (req, res, next) => {
  try {
    const { words, count } = req.body;
    
    if (!words || !Array.isArray(words) || words.length === 0) {
      throw new ApiError(400, 'Vui lòng cung cấp danh sách từ vựng.');
    }

    const questionCount = count || 5;
    const vocabList = words.join(', ');

    const prompt = `
Tôi đang học các từ vựng sau: ${vocabList}.
Hãy tạo ${questionCount} câu hỏi trắc nghiệm tiếng Anh để kiểm tra tôi về các từ này. 
BẮT BUỘC: Mỗi câu hỏi phải được viết dưới dạng một câu TOEIC Part 5 (Điền vào chỗ trống ________) với ngữ cảnh kinh doanh, công sở.
Trả về JSON (CHÍNH XÁC, không markdown):
{
  "exercises": [
    {
      "question": "Câu hỏi...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Giải thích tại sao..."
    }
  ]
}
Chỉ trả về JSON thuần.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
    });

    let parsed;
    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('No JSON block found');
      }
    } catch (parseErr) {
      console.error('JSON Parse Error:', parseErr, response.text);
      throw new ApiError(500, 'AI trả về định dạng không hợp lệ');
    }

    return ApiResponse.success(res, 'Đã tạo bài tập', parsed);
  } catch (error) {
    console.error('Generate Exercises Error:', error);
    next(error);
  }
};

// ============================================================
// AI Generate Exercises - Tạo bài tập từ Grammar Tip
// ============================================================
exports.generateGrammarExercises = async (req, res, next) => {
  try {
    const { title, structure, description, count } = req.body;
    
    if (!title && !structure) {
      throw new ApiError(400, 'Vui lòng cung cấp chủ đề hoặc cấu trúc ngữ pháp.');
    }

    const questionCount = count || 5;

    const prompt = `
Tôi đang học điểm ngữ pháp sau:
Tiêu đề: ${title}
Cấu trúc: ${structure}
Chi tiết: ${description || ''}

Hãy tạo ${questionCount} câu hỏi trắc nghiệm tiếng Anh để kiểm tra tôi về điểm ngữ pháp này.
BẮT BUỘC: Mỗi câu hỏi phải được viết dưới dạng một câu TOEIC Part 5 (Điền vào chỗ trống ________) với ngữ cảnh kinh doanh, công sở.
Trả về JSON (CHÍNH XÁC, không markdown):
{
  "exercises": [
    {
      "question": "Câu hỏi...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Giải thích tại sao..."
    }
  ]
}
Chỉ trả về JSON thuần.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
    });

    let parsed;
    try {
      const text = response.text;
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('No JSON block found');
      }
    } catch (parseErr) {
      console.error('JSON Parse Error:', parseErr, response.text);
      throw new ApiError(500, 'AI trả về định dạng không hợp lệ');
    }

    // Streak update removed as it's not implemented yet

    return ApiResponse.success(res, 'Đã tạo bài tập', parsed);
  } catch (error) {
    console.error('Generate Grammar Exercises Error:', error);
    next(error);
  }
};

// ============================================================
// AI Chatbot cho Landing Page
// ============================================================
exports.chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) throw new ApiError(400, 'Nội dung tin nhắn không được để trống.');

    const prompt = `
Bạn là một chuyên gia luyện thi TOEIC và là trợ lý ảo của nền tảng ToeicHub. Nhiệm vụ của bạn là:
1. Tư vấn và giải đáp các câu hỏi về ToeicHub: Nền tảng có các tính năng như Bảng tin (Feed), Tips & Ngữ pháp, Nhóm học tập (Groups), và Sổ tay từ vựng với Flashcard (SRS) (có dữ liệu 3000 từ cốt lõi). Hiện tại CHƯA có tính năng thi thử trọn bộ đề.
2. Trả lời các câu hỏi về phương pháp ôn thi TOEIC, tư vấn lộ trình học (ví dụ: làm sao để từ 500 lên 600+, cách học từ vựng hiệu quả, mẹo luyện nghe).
3. KHÔNG trả lời hay giải quyết các yêu cầu như "giải bài tập dài", "giải full đề thi". Nếu người dùng yêu cầu, hãy từ chối nhẹ nhàng và khuyên họ chia nhỏ ra.
4. KHÔNG trả lời các câu hỏi nằm ngoài phạm vi học tập tiếng Anh, thi chứng chỉ TOEIC hoặc nền tảng ToeicHub.
5. Câu trả lời cần ngắn gọn, xúc tích (tối đa 2-3 đoạn ngắn), giọng văn thân thiện, động viên.

Câu hỏi của người dùng: "${message}"
`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ text: prompt }]
    });

    return ApiResponse.success(res, 'AI trả lời thành công', { reply: response.text });
  } catch (error) {
    console.error('AI Chat Error:', error);
    next(new ApiError(500, 'Lỗi kết nối đến trợ lý AI. Vui lòng thử lại sau.'));
  }
};
