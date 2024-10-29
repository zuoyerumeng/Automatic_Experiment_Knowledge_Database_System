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
    const jsonExample = `
    {
        "name": "配置集群基本信息",
        "category": "开通 MapReduce 服务",
        "step_number": "2",
        "description": "点击“立即购买，进入购买集群页面，按照如下信息配置集群基本信息",
        "actions": [
            "点击立即购买",
            "配置集群信息"
        ],
        "details": {
            "区域": "华东-上海二",
            "集群名称": "mrs-hcia",
            "集群版本": "MRS2.1.0",
            "集群类型": "混合集群",
            "组件选择": [
                "分析组件（除Presto, Impala, Kudu）",
                "流式组件"
            ],
            "外部数据源": "不开启",
            "Kerberos认证": "不开启",
            "用户名": "admin",
            "计费模式": "按需计费",
            "可用分区": "默认",
            "虚拟私有云": "default_vpc",
            "子网": "default_subnet(192.16...)",
            "安全组": "自动创建",
            "弹性公网IP": "116.63.62.38"
        }
    }`;
    const prompt1 = `请先提取指定的、包含一个或多个实验单元的实验指导markdown文本中的'实体,关系,实体'格式三元组（不需要输出），具体内容为'前一步骤，先于，后一步骤'，用于构建知识图谱、指导用户实验，然后只需要输出两行txt格式的纯文本（输出首尾不需要用‘~~~ txt’的markdown语法渲染），第一行为所有实验名称（作为实体类型，要求仅输出内容，行首请勿输出'实验名称: '的提示词！），第二行为三元组中步骤（作为实体）的所有属性名，包含步骤序号step_number等属性，用','分隔。实体信息的样例如下：\n${jsonExample}\n实验指导markdown文本如下：\n${markdownText}`;

    try {
        const client = new ChatCompletion();
        
        // 第一轮问答
        const response1 = await client.chat({
            messages: [
                {
                    role: 'user',
                    content: prompt1,
                },
            ],
        }, 'ERNIE-4.0-Turbo-8K');

        const resultText1 = response1.result;
        const textFilePath = path.join(__dirname, 'uploads', 'experiments_and_attributes.txt');
        fs.writeFileSync(textFilePath, resultText1, 'utf-8');

        // 第二轮问答
        const prompt2 = `请基于上一轮问答的实验指导markdown文本、已经提取出的所有步骤属性等，输出所有步骤（每个步骤都单独作为一个实体）信息的JSON文本（输出首尾不需要用‘~~~ json’的markdown语法渲染），每个实验单元的所有步骤实体分别放在同一个数组中，其中每个步骤实体包含该步骤实体的名称（键为name，值为概括出的步骤作用）、实体类型（键为'category',值为实验名）和其他所有属性（键为属性名，值为属性值）。JSON格式步骤实体信息的样例如下：\n${jsonExample}\n实验指导markdown文本如下：\n${markdownText}`; 
        const response2 = await client.chat({
            messages: [
                {
                    role: 'user',
                    content: prompt2,
                },
            ],
        }, 'ERNIE-4.0-Turbo-8K');

        const resultText2 = response2.result;
        const jsonFilePath = path.join(__dirname, 'uploads', 'ontology.json');
        fs.writeFileSync(jsonFilePath, resultText2, 'utf-8');

        res.json({ message: '提取完成！', textFile: `/uploads/entity_labels_and_attributes.txt`, jsonFile: `/uploads/ontology.json` });
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
