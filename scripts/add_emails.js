const fs = require('fs');
const path = require('path');

const rawEmailData = `6787001	นาย	กรวีร์	สุวัฒนพันธ์	กาฟิวส์	MR.	Khorawee	Suwattanaphan	Garfield	khorawee.suw@student.mahidol.ac.th
6787004	นาย	กฤตนัย	งามปัญจะ	นาปาล์ม	MR.	Krittanai	Ngampanja	Napalm	krittanai.nga@student.mahidol.ac.th
6787008	นาย	กันตินันท์	ศรีสุวรรณ์		MR.	Kantinan	Srisuwan		kantinan.sri@student.mahidol.ac.th
6787016	นางสาว	ชนัญชิดา	จองคำ	จิงจิง	MISS	Chananchida	Chongkham	Jingjing 	chananchida.cho@student.mahidol.ac.th
6787017	นาย	ชีวานนท์	ศรีสวัสดิ์วัฒนา		MR.	Cheewanon	Srisawadwattana		cheewanon.sri@student.mahidol.ac.th
6787020	นาย	ณภัทร	โกมลมาลย์	นิว	MR.	Napat	Komolmal	New	napat.kom@student.mahidol.ac.th
6787021	นาย	ณภัทร	โพธิ์เรือง	ไกด์	MR.	Naphat	Phoruang	Guide	naphat.phu@student.mahidol.ac.th
6787022	นาย	ณัชพล	เวคินวัฒนเศรษฐ์		MR.	Nutchapon	Wakinwattanaset	MAX	natchapon.wak@student.mahidol.ac.th
6787028	นาย	ณัฐภูมินทร์	กล่ำมาตย์	แซน	MR.	Natthapumin	Klammat	SAND	natthapumin.kla@student.mahidol.ac.th
6787029	นาย	ณัฐศรัณย์	พรหมโชติ	ซัน	MR.	Natsaran	Pommachot	Sun	natsaran.pom@student.mahidol.ac.th
6787030	นางสาว	ณิชกานต์	สุขแพทย์	ลูกแพร์	MISS	Nitchakan	Sookphaeth	Lukpear 	nitchakan.soo@student.mahidol.ac.th
6787046	นางสาว	นฤภร	เจริญถาวรนนท์	เบลล์	MISS	Naroueporn	Charoenthawornnon	Bell	naroueporn.cha@student.mahidol.ac.th
6787048	นาย	นิธิโชติ	ไชยสิทธิ์	เจม	MR.	Nitichot	Chaiyasit	Jame	nitichot.cha@student.mahidol.ac.th
6787049	นาย	นิธิศ	เจริญดี	คิน	MR.	Nitis	Charoendee	KIN	nitis.cha@student.mahidol.ac.th
6787051	นาย	ปกรณ์	นิ่มนวล	ยอด	MR.	Pakon	Nimnuan	Yod	pakorn.nim@student.mahidol.ac.th
6787052	นาย	ปกรณ์เกียรติ์	วนมา	โฟล์ค	MR.	Pakornkiat	Vonma	Folk	pakornkiat.von@student.mahidol.ac.th
6787058	นาย	พงศกร	ประเสริฐศรีศิริ	ไนน์	MR.	Pongsakorn	Prasertsrisiri	NINE	pongsakorn.prs@student.mahidol.ac.th
6787059	นาย	พงษธัช	บุญแก้ว		MR.	Pongsatach	Boonkaew		pongsatach.boo@student.mahidol.ac.th
6787062	นางสาว	พิมพ์ธิดา	บุตรสระ	เนย	MISS	Pimthida	Butsra	์NOEY	pimthida.but@student.mahidol.ac.th
6787067	นางสาว	ภาวิดา	คร้ามวงษ์	ท้องฟ้า	MISS	Pavida	Khramwong	Thongfah	pavida.khr@student.mahidol.ac.th
6787070	นาย	วชิรวิทย์	สดแสงสุก		MR.	Wachiravit	Sodsangsook		wachiravit.sod@student.mahidol.ac.th
6787073	นาย	วัชรินทร์	หวังสป		MR.	Watcharin	Wangsop		watcharin.wag@student.mahidol.ac.th
6787076	นาย	วีราทร	ตรีสิริภพ	ชิงฟง	MR.	Veeratorn	Threesiriphop	Chingfong	veeratorn.tre@student.mahidol.ac.th
6787079	นาย	ศิรวิชญ์	ศรีสุขมั่งมี	พีช	MR.	Sirawich	Srisukmungmee	Peach	sirawich.srs@student.mahidol.ac.th
6787080	นาย	ศุภกิตติ์	สุวรรณ	ไนท์	MR.	Supakit	Suwan	NIGHT	supakit.suw@student.mahidol.ac.th
6787082	นาย	สิรวิชญ์	น้อยเจริญ	นุก	MR.	Sirawit	Noycharoen	Nuc	sirawit.noy@student.mahidol.ac.th
6787083	นาย	สุกฤษฏิ์	ชัชวาลย์	เฟิร์ส	MR.	Sukrit	Shatchawal	First	sukrit.cht@student.mahidol.ac.th
6787084	นาย	อนันต์สิทธิ์	โรจน์รัชสมบัติ	โอ๊ต	MR.	Anansit	Rojrachsombat	OAT	anansit.roj@student.mahidol.ac.th
6787086	นางสาว	อาทิตยา	พรมมี	ปลายฝน	MISS	Arthittaya	Prommee	PLAIFON	arthittaya.pro@student.mahidol.ac.th
6787088	นางสาว	กัญญาภัค	เหมวิลัย	เปรม	MISS	Kanyapak	Hemvilai	Prem	kanyapak.hem@student.mahidol.ac.th
6787089	นาย	กิรกร	ล้ำเลิศ		MR.	Kirakorn	Lumlerd		kirakorn.lum@student.mahidol.ac.th
6787092	นางสาว	สุพิชชา	แซ่ตั้ง		MISS	Supitcha	Saetang	PANG	supitcha.saa@student.mahidol.ac.th
6787094	นาย	เจฟฟี่ 	ฟิลลิปส์	เจฟฟี่	MR.	Jaffrey 	Phillips	Jaffrey	jaffreyamaga.phi@student.mahidol.ac.th
6787096	นาย	กันตพิชญ์	ลิมปิสวัสดิ์		MR.	Kantapit	Limpisawad	Kan	kantapit.lim@student.mahidol.ac.th
6787097	นางสาว	จณิสตา	ลิ้มพานิชย์	จิน	MISS	Janista	Limpanich	Jin	janista.lim@student.mahidol.ac.th
6787098	นาย	จิตติพัฒน์	แป้นย้อย	โย	MR.	Jittipat	Paenyoi	YO	jittipat.pae@student.mahidol.ac.th
6787104	นาย	ธรรนากร	คันศร		MR.	Thanakorn	Kansorn		thanakorn.kar@student.mahidol.ac.th
6787106	นาย	ธีรภัทร	แซ่ตั้ง	แชมป์	MR.	Thirapat	Saetang	Champ	thirapat.sat@student.mahidol.ac.th
6787111	นาย	พิริยากร	คดดี	เก้า	MR.	Piriyakorn	Koddee	Gao	piriyakon.cha@student.mahidol.ac.th
6787113	นาย	ภาคิน	นาคเจริญ	บอล	MR.	Pakin	Narkjaroen	Ball	pakin.nar@student.mahidol.ac.th
6787119	นาย	ศุภกิตติ์	ปิติสานต์	พูน	MR.	Supakit	Pitisan	Poon	supakit.pti@student.mahidol.ac.th`;

async function addEmails() {
   const csvPath = path.join(__dirname, 'merged_for_word.csv');
   
   if (!fs.existsSync(csvPath)) {
       console.error("Merged CSV not found at " + csvPath);
       return;
   }

   // 1. Parse Email Map
   const emailMap = new Map();
   const lines = rawEmailData.split(/\r?\n/).filter(line => line.trim());
   
   for (const line of lines) {
       // Split by tab or 2+ spaces to handle alignment
       const parts = line.split(/\t+| {2,}/).map(p => p.trim());
       
       // ID is first, Email is last
       const id = parts[0];
       const email = parts[parts.length - 1];
       
       if (id && email && email.includes('@')) {
           emailMap.set(id, email);
       }
   }
   
   console.log(`Loaded ${emailMap.size} emails from new raw data.`);
   
   // 2. Read CSV
   const csvContent = fs.readFileSync(csvPath, 'utf-8');
   const csvLines = csvContent.split(/\r?\n/);
   
   if (csvLines.length < 2) return;

   // 3. Process Header
   let header = csvLines[0];
   const headerParts = header.split(',');
   
   // Find indices
   const idIndex = headerParts.findIndex(h => h.trim().toLowerCase().includes('student id') || h.trim().toLowerCase() === 'id');
   let emailIndex = headerParts.findIndex(h => h.trim().toLowerCase() === 'email');
   
   if (idIndex === -1) {
       console.error("❌ Could not find Student ID column in CSV.");
       return;
   }

   // If Email column doesn't exist, append it
   if (emailIndex === -1) {
       header += ',Email';
       emailIndex = headerParts.length; // It will be the new last column
   }
   
   const newLines = [header];
   let matchedCount = 0;
   
   console.log("   CSV Header:", headerParts);
   console.log("   ID Column Index:", idIndex);
   console.log("   Example Map IDs:", Array.from(emailMap.keys()).slice(0, 5));
   
   // 4. Process Rows
   for (let i = 1; i < csvLines.length; i++) {
       const line = csvLines[i].trim();
       if (!line) continue;
       
       // Handle simple CSV splitting
       const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
       const cleanParts = parts.map(p => p ? p.replace(/^,|,$/g, '').trim().replace(/^"|"$/g, '') : '');
       
       const studentId = cleanParts[idIndex]; 
       
       if (i < 5) console.log(`   Check CSV ID: '${studentId}' vs Map has: ${emailMap.has(studentId)}`);
       
       let currentEmail = (emailIndex < cleanParts.length) ? cleanParts[emailIndex] : '';
       
       // Look up new email
       const newEmail = emailMap.get(studentId);
       
       if (newEmail) {
           // Overwrite if different
           if (newEmail !== currentEmail) {
               currentEmail = newEmail;
               matchedCount++;
           }
       }
       
       // Reconstruct
       const rowData = [...cleanParts];
       // Ensure enough columns
       while (rowData.length <= emailIndex) rowData.push('');
       rowData[emailIndex] = currentEmail;
       
       const newLine = rowData.map(p => (p && p.includes(',')) ? `"${p}"` : p).join(',');
       newLines.push(newLine);
   }
   
   fs.writeFileSync(csvPath, newLines.join('\n'));
   console.log(`✅ Updated CSV with emails.`);
   console.log(`   📧 Matched ${matchedCount} emails out of ${csvLines.length - 1} rows.`);
}

addEmails();
