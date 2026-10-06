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
  era: string;
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
    id: 'cai-cach-1744',
    loreId: 'lore-ngu-than-five-virtues',
    costumeId: 'ao-ngu-than-tay-chen',
    title: 'Cải cách Y phục Đàng Trong',
    chapter: 'Chúa Nguyễn Phúc Khoát · Khởi nguyên',
    era: 'Năm 1744 · Thời Chúa Nguyễn',
    question:
      'Năm 1744, để khẳng định vị thế độc lập của xứ Đàng Trong trước Đàng Ngoài, Chúa Vũ Vương Nguyễn Phúc Khoát đã ban hành định chế trang phục nào đặt nền móng cho chiếc Áo Ngũ Thân?',
    choices: [
      { id: 'a', label: 'Áo ngũ thân cài khuy bên phải mặc cùng quần lụa hai ống' },
      { id: 'b', label: 'Áo cổ tròn thêu rồng phượng mặc cùng váy nhiều nếp xòe' },
      { id: 'c', label: 'Áo giao lĩnh buông vạt tự do không cài cúc' },
    ],
    correctChoiceId: 'a',
    hint: 'Hãy nhớ về bước ngoặt chuyển từ mặc váy sang mặc quần hai ống kết hợp áo năm thân cài khuy.',
    learningNote:
      'Năm 1744, Chúa Nguyễn Phúc Khoát xưng vương và ban lệnh cải cách y phục Đàng Trong: bỏ tập tục mặc váy xướng của Đàng Ngoài, quy định nam nữ đều mặc áo năm thân cài khuy về bên phải, kết hợp quần hai ống. Đây chính là khởi nguồn lịch sử của áo ngũ thân và tiền thân áo dài sau này.',
    knowledgeType: 'documented',
    sourceLabel: 'Đại Nam Thực Lục Tiền Biên & Phủ Biên Tạp Lục (Lê Quý Đôn)',
  },
  {
    id: 'ngu-than-ngu-thuong',
    loreId: 'lore-ngu-than-five-virtues',
    costumeId: 'ao-ngu-than-tay-chen',
    title: 'Đạo lý Ngũ Thường & Tứ Thân',
    chapter: 'Áo Ngũ Thân · Triết lý Nho gia',
    era: 'Thế kỷ 18 - 19 · Triều Nguyễn',
    question:
      'Năm chiếc cúc (khuy) cài và cấu tạo năm thân vải trên chiếc Áo Ngũ Thân truyền thống biểu trưng cho đạo lý cốt lõi nào?',
    choices: [
      { id: 'a', label: 'Năm cửa ô kinh thành và năm phẩm trật quân sự' },
      { id: 'b', label: 'Ngũ Thường (Nhân - Lễ - Nghĩa - Trí - Tín) và Tứ thân phụ mẫu bao bọc người mặc' },
      { id: 'c', label: 'Năm loại vải thượng hạng trong ngành dệt gấm triều đình' },
    ],
    correctChoiceId: 'b',
    hint: 'Năm chiếc khuy tương ứng với năm đức tính của người quân tử, còn bốn thân ngoài che chở thân con bên trong.',
    learningNote:
      'Năm chiếc cúc tượng trưng cho Ngũ Thường (Nhân, Lễ, Nghĩa, Trí, Tín) nhắc nhở đạo làm người. Cấu trúc gồm 4 thân ngoài tượng trưng cho "Tứ thân phụ mẫu" (cha mẹ mình và cha mẹ bên phối ngẫu), thân thứ 5 nhỏ hơn nằm kín đáo bên trong tượng trưng cho người mặc luôn được gia đình yêu thương che chở.',
    knowledgeType: 'documented',
    sourceLabel: 'Khảo cứu cổ phục Việt Nam & Bảo tàng Lịch sử Quốc gia',
  },
  {
    id: 'chieu-cam-vay-minh-mang',
    loreId: 'lore-ngu-than-five-virtues',
    costumeId: 'ao-dai-truyen-thong',
    title: 'Chiếu chỉ Canh tân của Vua Minh Mạng',
    chapter: 'Vua Minh Mạng · Thống nhất y phục',
    era: 'Năm 1827 - 1837 · Triều Nguyễn',
    question:
      'Câu ca dao dân gian "Tháng chín có chiếu vua ra / Cấm quần không đáy người ta hãi hùng" ghi lại sự kiện lịch sử canh tân y phục nào?',
    choices: [
      { id: 'a', label: 'Sắc lệnh cấm phụ nữ mặc váy (quần không đáy), bắt buộc mặc quần hai ống' },
      { id: 'b', label: 'Chiếu chỉ cấm mặc lụa màu sặc sỡ trong các dịp hội làng' },
      { id: 'c', label: 'Lệnh cấm nam giới đội khăn đóng khi vào chốn nha môn' },
    ],
    correctChoiceId: 'a',
    hint: '"Quần không đáy" chính là cách gọi dân gian hóm hỉnh dành cho chiếc váy xưa.',
    learningNote:
      'Nhằm thống nhất quy chuẩn phong hóa từ Nam ra Bắc, vua Minh Mạng ban hành các đạo dụ từ năm 1827 đến 1837 cấm mặc váy (dân gian gọi hóm hỉnh là "quần không đáy"), buộc phụ nữ miền Bắc mặc quần dài hai ống như miền Trung và Nam. Sự kiện này đi vào ca dao dân gian và hoàn tất quá trình phổ cập quần hai ống trên cả nước.',
    knowledgeType: 'documented',
    sourceLabel: 'Đại Nam Thực Lục Chính Biên & Ca dao dân gian Bắc Bộ',
  },
  {
    id: 'nhat-binh-hoang-cung',
    loreId: 'lore-nhat-binh-collar',
    costumeId: 'ao-nhat-binh',
    title: 'Cổ áo Nhật Bình & Dải Ngũ Sắc',
    chapter: 'Áo Nhật Bình · Triều phục Hậu phi',
    era: 'Thời Nguyễn (1802 - 1945)',
    question:
      'Đặc điểm cấu tạo nổi bật nhất giúp nhận diện Áo Nhật Bình triều Nguyễn là gì?',
    choices: [
      { id: 'a', label: 'Hai vạt áo khép lại tạo thành dải cổ hình chữ nhật (chữ Nhật 日) trước ngực, viền ngũ sắc' },
      { id: 'b', label: 'Cổ tròn ôm sát khép kín có đính chuỗi hạt ngọc trai' },
      { id: 'c', label: 'Vạt áo may liền thành váy một mảnh xòe rộng chạm đất' },
    ],
    correctChoiceId: 'a',
    hint: 'Tên gọi "Nhật Bình" bắt nguồn trực tiếp từ hình dáng dải cổ áo trước ngực.',
    learningNote:
      'Áo Nhật Bình là thường triều phục của Hoàng thái hậu, Hoàng hậu, Công chúa và lễ phục của mệnh phụ triều Nguyễn. Tên "Nhật Bình" bắt nguồn từ cổ áo hình chữ nhật (chữ Nhật 日) phẳng phiu trước ngực. Dưới cổ áo có dải viền ngũ sắc tượng trưng cho Ngũ hành (Kim - Mộc - Thủy - Hỏa - Thổ), tay áo có dải phụng quang đa sắc lộng lẫy.',
    knowledgeType: 'documented',
    sourceLabel: 'Khâm Định Đại Nam Hội Điển Sự Lệ · Quy chế quan phục thời Nguyễn',
    sourceUrl: 'https://baotanglichsu.vn/vi/Articles/3096/18397/net-djep-van-hoa-trong-ta-ao-dai-cua-phu-nu-viet.html',
  },
  {
    id: 'ao-tac-le-nghi',
    loreId: 'lore-ao-tac-ceremonial',
    costumeId: 'ao-tac',
    title: 'Nguồn gốc tên gọi Áo Tấc',
    chapter: 'Áo Tấc · Đại lễ truyền thống',
    era: 'Thời Nguyễn · Quốc lễ & Hôn lễ',
    question:
      'Tại sao chiếc áo ngũ thân tay thụng trang nghiêm dùng trong tế tự, đại lễ và cưới hỏi lại có tên gọi dân gian là "Áo Tấc"?',
    choices: [
      { id: 'a', label: 'Vì phần tà áo ngắn hơn áo thường đúng một tấc' },
      { id: 'b', label: 'Vì phần tay áo buông thụng rộng đúng một tấc ta (khoảng 10 - 12cm)' },
      { id: 'c', label: 'Vì chỉ những bậc có công khai hoang một tấc đất mới được ban áo' },
    ],
    correctChoiceId: 'b',
    hint: 'Hãy chú ý đến kích thước đo lường phần tay áo thụng rủ xuống khi buông thẳng.',
    learningNote:
      'Áo Tấc còn gọi là áo thụng hay áo ngũ thân tay thụng. Tên gọi "Áo Tấc" xuất phát từ phần thụng tay rộng đúng một tấc ta (khoảng 10-12cm). Khi người mặc chắp tay cúc cung bái lễ, tay áo thụng rủ xuống che kín hoàn toàn hai bàn tay, tạo nên phong thái trang nghiêm, cung kính tuyệt đối.',
    knowledgeType: 'documented',
    sourceLabel: 'Ngàn Năm Áo Mũ · Trần Quang Đức (2013)',
  },
  {
    id: 'giao-linh-huu-nham',
    loreId: 'lore-giao-linh-le-dynasty',
    costumeId: 'ao-giao-linh',
    title: 'Cổ Giao Lĩnh & Quy tắc Hữu Nhậm',
    chapter: 'Áo Giao Lĩnh · Thời Lý - Trần - Lê',
    era: 'Thế kỷ 11 - 18 · Lý, Trần, Lê',
    question:
      'Trong các bức tranh chân dung cổ (như tượng và tranh Nguyễn Trãi), quy tắc cài vạt cổ áo Giao Lĩnh của người Việt là gì?',
    choices: [
      { id: 'a', label: 'Vạt trái vắt sang phải đè lên vạt phải (Hữu nhậm - cài sang phía nách phải)' },
      { id: 'b', label: 'Vạt phải vắt sang trái đè lên vạt trái (Tả nhậm - cài sang phía nách trái)' },
      { id: 'c', label: 'Hai vạt cài thẳng chính giữa ngực bằng hàng cúc đồng' },
    ],
    correctChoiceId: 'a',
    hint: '"Hữu nhậm" là chuẩn mực văn minh của các triều đại cổ phong phương Đông.',
    learningNote:
      'Giao Lĩnh là kiểu áo cổ chéo có lịch sử lâu đời từ thời Lý - Trần đến Lê Trung Hưng. Người Việt luôn giữ quy chuẩn văn minh "Hữu nhậm" (vạt bên trái vắt qua ngực đè lên vạt phải rồi buộc dải lụa bên nách phải). Ngược lại, "Tả nhậm" (vạt phải đè vạt trái) chỉ dùng cho người đã khuất hoặc phong tục của các tộc ngoại vi.',
    knowledgeType: 'documented',
    sourceLabel: 'Bảo vật Quốc gia: Chân dung Nguyễn Trãi & Tượng thời Hậu Lê',
  },
  {
    id: 'vien-linh-bo-tu',
    loreId: 'lore-giao-linh-le-dynasty',
    costumeId: 'ao-vien-linh',
    title: 'Áo Viên Lĩnh & Bổ Tử Triều Đình',
    chapter: 'Áo Viên Lĩnh · Triều phục Quan lại',
    era: 'Thời Lê Sơ & Thời Nguyễn',
    question:
      'Trên áo Viên Lĩnh (cổ tròn) của quan lại triều đình, tấm "Bổ Tử" vuông đính trước ngực và sau lưng dùng để phân biệt điều gì?',
    choices: [
      { id: 'a', label: 'Văn quan thêu chim muông (Hạc, Cò, Nhạn), Võ quan thêu thú dữ (Kỳ lân, Bạch hổ, Báo)' },
      { id: 'b', label: 'Văn quan thêu hoa cỏ mùa xuân, Võ quan thêu vũ khí đao kiếm' },
      { id: 'c', label: 'Chỉ quan chức hoàng tộc mới được đeo Bổ Tử hình vuông' },
    ],
    correctChoiceId: 'a',
    hint: 'Quan văn chuộng phẩm hạnh thanh tao như loài chim, quan võ biểu trưng sức mạnh muông thú.',
    learningNote:
      'Viên Lĩnh là dạng áo cổ tròn khép kín, bên trong lộ viền cổ áo lót trắng (trung đơn). Phẩm hàm quan lại được thể hiện qua tấm Bổ Tử (miếng vải vuông thêu trước ngực và sau lưng): quan văn chuộng đức tính thanh nhã nên thêu các loài chim (Hạc, Cẩm kê, Khổng tước...), quan võ biểu trưng cho sức mạnh hộ quốc nên thêu muông thú dũng mãnh (Kỳ lân, Bạch hổ, Sư tử...).',
    knowledgeType: 'documented',
    sourceLabel: 'Lịch Triều Hiến Chương Loại Chí · Quan chức chí & Lễ nghi chí',
  },
  {
    id: 'tu-than-kinh-bac-yem',
    loreId: 'lore-tu-than-kinh-bac',
    costumeId: 'ao-tu-than-kinh-bac',
    title: 'Áo Tứ Thân & Nét duyên Kinh Bắc',
    chapter: 'Áo Tứ Thân · Dân gian Bắc Bộ',
    era: 'Thế kỷ 17 - 20 · Văn hóa Bắc Bộ',
    question:
      'Áo Tứ Thân của người phụ nữ Bắc Bộ gồm có bao nhiêu tà áo và cách mặc truyền thống ra sao?',
    choices: [
      { id: 'a', label: 'Hai tà sau ghép sống lưng, hai tà trước buông hoặc thắt vạt, lấp ló yếm đào bên trong' },
      { id: 'b', label: 'Bốn tà may rời hoàn toàn xòe tròn như chiếc dù hoa' },
      { id: 'c', label: 'Ba tà trước che kín cổ và một tà sau ngắn chấm lưng' },
    ],
    correctChoiceId: 'a',
    hint: 'Đường sống lưng tượng trưng cho sự ngay thẳng, hai vạt trước buộc chéo khéo léo để lộ yếm thắm.',
    learningNote:
      'Áo Tứ Thân gồm thân sau may ghép từ hai mảnh vải (tạo thành đường sống lưng thẳng thắn), hai thân trước tách rời để người phụ nữ có thể buông tà tha thướt khi đi hội hoặc buộc thắt nút trước bụng khi lao động. Bên trong mặc yếm đào (hoặc yếm nâu), thắt lưng hoa lý, đầu đội nón quai thao hoặc chít khăn mỏ quạ.',
    knowledgeType: 'documented',
    sourceLabel: 'Bảo tàng Phụ nữ Việt Nam & Nghiên cứu trang phục dân gian',
  },
  {
    id: 'khan-dong-chu-nhan',
    loreId: 'lore-ngu-than-five-virtues',
    costumeId: 'ao-ngu-than-tay-chen',
    title: 'Khăn Đóng & Nếp chữ Nhân',
    chapter: 'Khăn Đóng / Khăn Vấn · Phụ kiện',
    era: 'Thời Nguyễn đến hiện đại',
    question:
      'Chiếc khăn đóng (khăn xếp) truyền thống khi đội lên đầu thường có nếp gấp giao nhau trước trán tạo thành hình chữ gì?',
    choices: [
      { id: 'a', label: 'Chữ "Nhân" (人) tượng trưng cho lòng nhân ái và đạo làm người' },
      { id: 'b', label: 'Chữ "Vương" (王) thể hiện quyền uy tối cao' },
      { id: 'c', label: 'Chữ "Tâm" (心) thêu kim tuyến lấp lánh' },
    ],
    correctChoiceId: 'a',
    hint: 'Chữ Hán này gồm hai nét phẩy và mác gặp nhau, nhắc nhở về phẩm hạnh con người.',
    learningNote:
      'Khăn đóng (khăn xếp) nam giới triều Nguyễn thường quấn nhiều vòng, nếp gấp ở chính giữa trán giao nhau tạo thành hình chữ "Nhân" (人) hoặc chữ "Nhất" (一). Người xưa quan niệm chiếc khăn trên đầu như lời nhắc nhở luôn giữ cốt cách nhân nghĩa, đàng hoàng, ngay thẳng trong mọi hoàn cảnh.',
    knowledgeType: 'documented',
    sourceLabel: 'Tục vấn khăn và văn hóa phục sức người Việt',
  },
  {
    id: 'ao-ba-ba-nam-bo',
    loreId: 'lore-tu-than-kinh-bac',
    costumeId: 'ao-ba-ba-nam-bo',
    title: 'Hồn cốt Áo Bà Ba Nam Bộ',
    chapter: 'Áo Bà Ba · Sông nước phương Nam',
    era: 'Thế kỷ 19 - 20 · Nam Bộ',
    question:
      'Chi tiết thiết kế nào giúp Áo Bà Ba trở nên đặc biệt thuận tiện cho đời sống sinh hoạt, chèo thuyền miền sông nước?',
    choices: [
      { id: 'a', label: 'Thân áo ngắn chớm hông, xẻ tà hai bên sườn và có hai túi lớn tiện dụng phía trước' },
      { id: 'b', label: 'Áo dài chấm gót chân có thắt đai lưng da bó sát' },
      { id: 'c', label: 'Tay áo may rộng phồng như cánh buồm thuyền nan' },
    ],
    correctChoiceId: 'a',
    hint: 'Chiếc áo ngắn ngang hông, xẻ tà hai bên giúp cử động bơi xuồng nhẹ nhàng, có túi đựng vật dụng.',
    learningNote:
      'Áo Bà Ba xuất hiện vào nửa đầu thế kỷ 19 tại Nam Bộ. Áo được may ngắn ngang hông, xẻ tà hai bên sườn tạo sự thoáng mát và dễ dàng cử động khi bơi xuồng, làm đồng. Hai chiếc túi to phía trước rất tiện để đựng trầu cau, khăn tay hoặc thuốc rê. Áo thường đi cùng khăn rằn rực rỡ và nón lá duyên dáng.',
    knowledgeType: 'documented',
    sourceLabel: 'Văn hóa dân gian Nam Bộ & Nhà văn Sơn Nam',
  },
];
