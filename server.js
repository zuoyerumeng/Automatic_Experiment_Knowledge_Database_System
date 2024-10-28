const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const { ChatCompletion, setEnvVariable } = require('@baiducloud/qianfan');

// 设置安全认证AK/SK鉴权
setEnvVariable('QIANFAN_ACCESS_KEY', '');
setEnvVariable('QIANFAN_SECRET_KEY', '');

const app = express();
app.use(express.json());

// 自定义 storage 配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['pdf', 'json'];
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            return cb(new Error('抱歉，您上传的文件不是PDF或JSON，请重新上传！'));
        }
        cb(null, true);
    }
});

app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/upload', upload.single('file'), (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    const fileExtension = req.file.filename.split('.').pop().toLowerCase();

    if (fileExtension === 'pdf') {
        const outputMdPath = filePath.replace('.pdf', '.md');
        // 立即返回响应
        res.json({ message: '上传成功！', markdownFile: `/uploads/${path.basename(outputMdPath)}` });

        // 调用 PaddleOCR 处理 PDF 文件
        exec(`python3 process_pdf.py ${filePath} ${outputMdPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
            }
        });
    } else {
        res.json({ message: '上传成功！', file: req.file });
    }
});

app.post('/submit-markdown', async (req, res) => {
    const markdownText = req.body.markdown;
    const prompt = `请先提取指定实验指导markdown文本中的‘实体,关系,实体’三元组（不需要输出），用于构建知识图谱、指导用户实验，
然后提取三元组中实体的实体类型和属性组（多个属性名及其属性值）（也不需要输出），最后只需要输出所有实体信息的JSON格式文本（JSON语言不需要用markdown语法渲染），
包含实体类型（键为"category"，值为实体类型名）、属性组（键为属性名，值为属性值）、与该实体相关的关系（键为关系名，值为该关系对应的一个或多个实体（即存在多个相同关系名的关系）组成的数组。实体中的近义词用相同的词语表示，实体信息具体的JSON格式如下：
"_id": { "$oid": "5bb578b6831b973a137e3ee6" }, "name": "肺泡蛋白质沉积症", "desc": "肺泡蛋白质沉积症(简称PAP)，又称Rosen-Castle-man-Liebow综合征，
是一种罕见疾病。该病以肺泡和细支气管腔内充满PAS染色阳性，来自肺的富磷脂蛋白质物质为其特征，好发于青中年，男性发病约3倍于女性。",
"category": [ "疾病百科", "内科", "呼吸内科" ], "prevent": "1、避免感染分支杆菌病，卡氏肺囊肿肺炎，巨细胞病毒等。\n2、注意锻炼身体，
提高免疫力。", "cause": "病因未明，推测与几方面因素有关：如大量粉尘吸入（铝，二氧化硅等），机体免疫功能下降（尤其婴幼儿），遗传因素，
酗酒，微生物感染等，而对于感染，有时很难确认是原发致病因素还是继发于肺泡蛋白沉着症，例如巨细胞病毒，卡氏肺孢子虫，组织胞浆菌感染等均发现有肺泡内高蛋白沉着。\n虽然启动因素尚不明确，但基本上同意发病过程为脂质代谢障碍所致，即由于机体内，外因素作用引起肺泡表面活性物质的代谢异常，到目前为止，研究较多的有肺泡巨噬细胞活力，动物实验证明巨噬细胞吞噬粉尘后其活力明显下降，而病员灌洗液中的巨噬细胞内颗粒可使正常细胞活力下降，经支气管肺泡灌洗治疗后，其肺泡巨噬细胞活力可上升，而研究未发现Ⅱ型细胞生成蛋白增加，全身脂代谢也无异常，因此目前一般认为本病与清除能力下降有关。",
"symptom": [ "紫绀", "胸痛", "呼吸困难", "乏力", "毓卓" ] \n
实验指导markdown文本如下：\n
${markdownText}`;

    try {
        const client = new ChatCompletion();
        const response = await client.chat({
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        }, 'ERNIE-4.0-Turbo-8K');

        const resultText = response.result;
        const jsonFilePath = path.join(__dirname, 'uploads', 'triples.json');
        fs.writeFileSync(jsonFilePath, resultText, 'utf-8');

        res.json({ message: '提取完成！', jsonFile: `/uploads/triples.json` });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '提取失败，请重试。' });
    }
});

app.use((err, req, res, next) => {
    if (err) {
        res.status(400).json({ message: err.message });
    } else {
        next();
    }
});

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
