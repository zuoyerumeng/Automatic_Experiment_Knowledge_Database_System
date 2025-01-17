const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const xml2js = require('xml2js');
const { ChatCompletion, setEnvVariable } = require('@baiducloud/qianfan');

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
        const allowedExtensions = ['pdf', 'xml'];
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            return cb(new Error('抱歉，您上传的文件不是PDF或XML，请重新上传！'));
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


app.use(express.urlencoded({ extended: true }));

app.post('/submit-markdown', async (req, res) => {
    const markdownText = req.body.markdown;
    const xmlFilePath1 = path.join(__dirname, 'uploads', 'RDF_example.xml');
    const xmlData = fs.readFileSync(xmlFilePath1, 'utf8');
    const parsedXML = await xml2js.parseStringPromise(xmlData);
    const prompt = `请根据给定的一个或多个实验单元的实验指导markdown文本构建出其本体信息，内容包括实验的目的、要求/任务、原理、环境、仪器设备、步骤、数据记录、结果、结果分析、讨论（优缺点和改进方法）、参考文献信息，用于构建知识图谱和指导用户按照步骤完成实验，RDF XML示例如下：\n${JSON.stringify(parsedXML)}\n实验指导markdown文本如下：\n${markdownText}`;
    
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

        let resultText = response.result;
        const lines1 = resultText.split('\n');
        if (lines1.length > 2) {
            resultText = lines1.slice(1, -1).join('\n');
        }
        // 处理问答结果
        const xmlFilePath2 = path.join(__dirname, 'uploads', 'ontology.xml');

        // 检查文件是否存在并追加内容
        if (fs.existsSync(xmlFilePath2)) {
            const existingContent = fs.readFileSync(xmlFilePath2, 'utf-8');
            const newContent = existingContent.trim() + ',\n' + resultText;
            fs.writeFileSync(xmlFilePath2, newContent, 'utf-8');
        } else {
            fs.writeFileSync(xmlFilePath2, resultText, 'utf-8');
        }

        // 返回响应
        res.json({ 
            message: '提取完成！', 
            xmlFile: `/uploads/ontology.xml`, 
        });
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

app.post('/run-scripts', (req, res) => {
    res.json({ 
        message: 'success', 
        graphUrl: 'http://localhost:7474' 
    });
});

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
