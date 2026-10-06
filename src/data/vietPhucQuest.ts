export interface VietPhucQuestChoice {
  id: string;
  label: string;
}

export interface VietPhucQuestStage {
  id: string;
  loreId: string;
  costumeId: string;
  title: string;
  chapter: string;
  question: string;
  choices: VietPhucQuestChoice[];
  correctChoiceId: string;
  hint: string;
  learningNote: string;
  knowledgeType: 'documented' | 'interpretation';
  sourceLabel: string;
  sourceUrl?: string;
}

export const VIET_PHUC_QUEST_STAGES: VietPhucQuestStage[] = [
  {
    id: 'ngu-than-five-panels',
    loreId: 'lore-ngu-than-five-virtues',
    costumeId: 'ao-ngu-than-tay-chen',
    title: 'Giải mã thân áo thứ năm',
    chapter: 'Áo Ngũ Thân · Nếp nhà',
    question: 'Theo cách diễn giải trong thẻ Quest này, thân thứ năm gợi nhắc đến ai?',
    choices: [
      { id: 'the-wearer', label: 'Chính người mặc, được gia đình chở che' },
      { id: 'royal-rank', label: 'Một cấp bậc trong hoàng cung' },
      { id: 'five-elements', label: 'Một trong năm yếu tố của Ngũ Hành' },
    ],
    correctChoiceId: 'the-wearer',
    hint: 'Nghĩ về mối quan hệ giữa bốn thân áo bên ngoài và người đang mặc áo.',
    learningNote:
      'Thẻ Quest nêu ý nghĩa “người mặc được gia đình chở che” như một cách đọc biểu trưng. Phần cấu tạo năm thân có thể quan sát trên áo; còn ý nghĩa biểu trưng này cần trích dẫn tư liệu cụ thể trước khi khẳng định như kết luận lịch sử.',
    knowledgeType: 'interpretation',
    sourceLabel: 'Diễn giải trong thẻ Quest · chưa có trích dẫn trang cụ thể để xác nhận như kết luận lịch sử',
  },
  {
    id: 'nhat-binh-collar',
    loreId: 'lore-nhat-binh-collar',
    costumeId: 'ao-nhat-binh',
    title: 'Dấu hiệu trên dải cổ',
    chapter: 'Áo Nhật Bình · Triều phục',
    question: 'Theo mô tả cấu trúc áo Nhật Bình, phần cổ tạo thành hình gì khi hai vạt được ghép lại?',
    choices: [
      { id: 'rectangular-collar', label: 'Một mảng hình chữ nhật trước ngực' },
      { id: 'sun-embroidery', label: 'Hình mặt trời thêu giữa lưng' },
      { id: 'round-neck', label: 'Cổ tròn ôm sát quanh cổ' },
    ],
    correctChoiceId: 'rectangular-collar',
    hint: 'Manh mối nằm ngay ở phần cổ áo, không phải hoa văn giữa thân.',
    learningNote:
      'Tư liệu của Trường Đại học Sư phạm Nghệ thuật Trung ương mô tả hai vạt ghép lại thành hình chữ nhật ở trước ngực; bài viết cũng giải thích tên Nhật Bình theo đặc điểm này.',
    knowledgeType: 'documented',
    sourceLabel: 'Trường ĐH Sư phạm Nghệ thuật Trung ương · Nghiên cứu hiện vật Nhật Bình',
    sourceUrl: 'https://spnttw.edu.vn/dao-tao/di-san-van-hoa-va-su-phuc-hung-trong-doi-song-hien-dai-cua-ao-nhat-binh/',
  },
  {
    id: 'ao-tac-sleeves',
    loreId: 'lore-ao-tac-ceremonial',
    costumeId: 'ao-tac',
    title: 'Tay áo trong nghi lễ',
    chapter: 'Áo Tấc · Lễ nghi',
    question: 'Chi tiết nào dễ nhận ra trên phom Áo Tấc?',
    choices: [
      { id: 'wide-sleeves', label: 'Tay áo dài và rộng' },
      { id: 'short-sleeves', label: 'Tay áo ngắn để dễ vận động' },
      { id: 'tight-collar', label: 'Cổ áo cao và ôm sát làm điểm nhấn chính' },
    ],
    correctChoiceId: 'wide-sleeves',
    hint: 'Hãy để ý độ rộng của tay áo so với kiểu tay chẽn.',
    learningNote:
      'Áo Tấc còn được gọi là áo ngũ thân tay phụng, áo lễ hoặc áo thụng; tay áo rộng là đặc điểm dễ nhận biết. Bối cảnh sử dụng cụ thể cần đối chiếu theo thời kỳ và nghi lễ, không nên suy rộng thành một quy tắc cho mọi trường hợp.',
    knowledgeType: 'documented',
    sourceLabel: 'Khảo cứu Ngàn Năm Áo Mũ · Trần Quang Đức (2013)',
  },
  {
    id: 'giao-linh-crossing',
    loreId: 'lore-giao-linh-le-dynasty',
    costumeId: 'ao-giao-linh',
    title: 'Dấu hiệu cổ giao nhau',
    chapter: 'Áo Giao Lĩnh · Lê Trung Hưng',
    question: 'Đặc điểm nào giúp nhận ra kiểu cổ Giao Lĩnh?',
    choices: [
      { id: 'cross-collar', label: 'Hai vạt cổ giao nhau tạo thành cổ chéo' },
      { id: 'round-collar', label: 'Cổ tròn liền quanh cổ' },
      { id: 'center-buttons', label: 'Hai vạt khép thẳng giữa thân bằng hàng khuy' },
    ],
    correctChoiceId: 'cross-collar',
    hint: 'Tên gọi mô tả hai phần cổ giao nhau; câu hỏi không yêu cầu đoán trái hay phải theo góc nhìn.',
    learningNote:
      '“Giao lĩnh” mô tả cấu trúc cổ áo có hai vạt giao nhau. Hướng vạt trái/phải cần ghi rõ góc nhìn người mặc hay người quan sát và căn cứ hiện vật cụ thể; Quest không dùng hướng vạt làm đáp án tuyệt đối.',
    knowledgeType: 'documented',
    sourceLabel: 'Ngàn Năm Áo Mũ · Trần Quang Đức (2013); mô tả cấu trúc, không chốt hướng vạt',
  },
  {
    id: 'tu-than-yem-dao',
    loreId: 'lore-tu-than-kinh-bac',
    costumeId: 'ao-tu-than-kinh-bac',
    title: 'Mảnh sắc màu sau bốn vạt',
    chapter: 'Áo Tứ Thân · Kinh Bắc',
    question: 'Chi tiết nào thường thấp thoáng bên trong hai vạt trước?',
    choices: [
      { id: 'yem-dao', label: 'Mép yếm đào' },
      { id: 'white-trouser', label: 'Cổ quần lụa trắng' },
      { id: 'embroidered-collar', label: 'Dải cổ thêu kim tuyến' },
    ],
    correctChoiceId: 'yem-dao',
    hint: 'Đó là một lớp áo trong, thường tạo điểm màu hồng đào trước bụng.',
    learningNote:
      'Áo Tứ Thân là một dạng y phục phụ nữ Bắc Bộ; cách phối với yếm và các lớp áo trong là hình ảnh quen thuộc trong diễn xướng, nhưng không phải mọi áo Tứ Thân hay mọi dịp mặc đều có cùng một cách phối.',
    knowledgeType: 'documented',
    sourceLabel: 'Bảo tàng Lịch sử Quốc gia · Nét đẹp văn hóa trong tà áo dài của phụ nữ Việt',
    sourceUrl: 'https://baotanglichsu.vn/vi/Articles/3096/18397/net-djep-van-hoa-trong-ta-ao-dai-cua-phu-nu-viet.html',
  },
];
