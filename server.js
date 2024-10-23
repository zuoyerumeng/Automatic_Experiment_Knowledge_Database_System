const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const { ChatCompletion, setEnvVariable } = require('@baiducloud/qianfan');

// 设置安全认证AK/SK鉴权
setEnvVariable('QIANFAN_ACCESS_KEY', 'ALTAKsVB2mb0lrrAmypmqZut6z');
setEnvVariable('QIANFAN_SECRET_KEY', 'd07fce83c7f0420ab4c52b5b9d5265d8');

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
        const allowedExtensions = ['pdf', 'csv'];
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            return cb(new Error('抱歉，您上传的文件不是PDF或CSV，请重新上传！'));
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
    const prompt = `请提取如下实验指导markdown中的‘实体,关系,实体’三元组，用于构建知识图谱、指导用户实验，注意只需要输出纯CSV格式的文本，不需要其他任何额外的解释内容，具体格式为每行都为一组‘实体，关系，实体’的三元组\n${markdownText}`;

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
        const csvFilePath = path.join(__dirname, 'uploads', 'triples.csv');
        fs.writeFileSync(csvFilePath, resultText, 'utf-8');

        res.json({ message: '提取完成！', csvFile: `/uploads/triples.csv` });
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
