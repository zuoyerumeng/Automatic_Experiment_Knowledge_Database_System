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


app.use(express.urlencoded({ extended: true }));

app.post('/submit-markdown', async (req, res) => {
    const markdownText = req.body.markdown;
    const jsonExample1 = `
{
    "Experiment": "管理华为云 MRS 服务",
    "Steps": [
        {
            "name": "下载 Winscp",
            "category": "使用Winscp在Window和Linux服务器之间传输文件",
            "step_number": "1",
            "description": "打开网址：https://winscp.net/eng/download.php 下载软件，安装完成后打开软件",
            "actions": [
                "打开网址下载Winscp",
                "安装Winscp",
                "打开Winscp"
            ],
            "details": {}
        },
        {
            "name": "连接服务器",
            "category": "使用Winscp在Window和Linux服务器之间传输文件",
            "step_number": "2",
            "description": "在登录界面，填入申请的弹性 IP、端口号默认22、用户名、密码,点击登录，弹出框选择“Yes”",
            "actions": [
                "填入弹性IP、端口号、用户名、密码",
                "点击登录",
                "选择Yes"
            ],
            "details": {
                "端口号": "22"
            }
        },
        {
            "name": "打开控制台",
            "category": "访问集群的管理页面",
            "step_number": "1",
            "description": "在华为云 MRS 服务的控制台页面，单击集群名称“mrs-hcia”进入集群详情页面",
            "actions": [
                "打开华为云 MRS 服务的控制台页面",
                "单击集群名称进入集群详情页面"
            ],
            "details": {
                "集群名称": "mrs-hcia"
            }
        },
        {
            "name": "点击”点击查看”按钮",
            "category": "访问集群的管理页面",
            "step_number": "2",
            "description": "在集群详情页面，点击”点击查看”按钮，进入集群管理页面，在弹出框中选择弹性IP（如果没有弹性IP，需要去购买），勾选确认框，点击”确定”",
            "actions": [
                "点击”点击查看”按钮",
                "选择弹性IP",
                "勾选确认框",
                "点击确定"
            ],
            "details": {}
        },
        {
            "name": "输入用户名及密码",
            "category": "访问集群的管理页面",
            "step_number": "3",
            "description": "在弹出页面中输入用户名：admin及密码（密码是在申请集群时设置），点击“登录”",
            "actions": [
                "输入用户名及密码",
                "点击登录"
            ],
            "details": {
                "用户名": "admin"
            }
        }
    ],
    "Knowledge": [
        "winscp",
        "MRS"
    ]
}`;

        // 第一轮问答
        const prompt1 = `请提取出给定一个或多个实验单元的实验指导markdown文本所包含步骤本体信息和‘实体,关系,实体’三元组的JSON格式文本，用于构建知识图谱和指导用户按照步骤完成实验，要求把步骤拆分得尽可能多。只需要输出JSON文本内容，不需要其他任何解释内容。示例如下，其中"Experiment"为所有实验单元所属的总实验的名称，"Steps"为某个实验单元的实验步骤，它的"name"为某个实验步骤的名称、"category"为该实验步骤所属的实验单元、"step_number"为该实验步骤的步骤序号、"description"为该实验步骤的描述、"actions"为该实验步骤的具体操作、"details"为该实验步骤的具体细节，"Knowledges"中为所有三元组的实体的名称：\n${jsonExample1}\n实验指导markdown文本如下：\n${markdownText}`;

    try {
        const client = new ChatCompletion();
        const response1 = await client.chat({
            messages: [
                {
                    role: 'user',
                    content: prompt1,
                },
            ],
        }, 'ERNIE-4.0-Turbo-8K');

        let resultText1 = response1.result;
        const lines1 = resultText1.split('\n');
        if (lines1.length > 2) {
            resultText1 = lines1.slice(1, -1).join('\n');
        }
        // 处理第一轮问答结果
        const jsonFilePath1 = path.join(__dirname, 'uploads', 'steps.json');

        // 检查文件是否存在并追加内容
        if (fs.existsSync(jsonFilePath1)) {
            const existingContent = fs.readFileSync(jsonFilePath, 'utf-8');
            const newContent = existingContent.trim() + ',\n' + resultText1;
            fs.writeFileSync(jsonFilePath1, newContent, 'utf-8');
        } else {
            fs.writeFileSync(jsonFilePath1, resultText1, 'utf-8');
        }

        // 第二轮问答
        const jsonExample2=`
{
    "entities": [
        {
            "entity_name": "MapReduce",
            "category": "服务",
            "description": "MapReduce是一种分布式计算框架",
            "relations": [
                {
                    "relation_name": "开通",
                    "relation_entities": [
                        "步骤"
                    ]
                }
            ]
        }
    ]
}`;
        const prompt2 = `请基于上一轮问答中给定的实验指导markdown文本，先提取指定实验指导markdown文本中的‘实体,关系,实体’三元组（不需要输出），用于构建知识图谱、指导用户实验，然后提取三元组中实体的实体类型和属性组（多个属性名及其属性值）（也不需要输出），最后只需要输出所有实体信息的JSON格式文本，包含实体类型（键为"category"，值为实体类型名）、属性组（键为属性名，值为属性值）、与该实体相关的关系（键为关系名，值为该关系对应的一个或多个实体（即存在多个相同关系名的关系）组成的数组。实体中的近义词用相同的词语表示，实体信息具体的JSON格式如下：${jsonExample2}`;
        const response2 = await client.chat({
            messages: [
                {
                    role: 'user',
                    content: prompt1,
                },
                {
                     role: "assistant",
                     content: resultText1,
                 },
                {
                    role: 'user',
                    content: prompt2,
                },
            ],
        }, 'ERNIE-4.0-Turbo-8K');

        let resultText2 = response2.result;
        const lines2 = resultText2.split('\n');
        if (lines2.length > 2) {
            resultText2 = lines2.slice(1, -1).join('\n');
        }
        const jsonFilePath2 = path.join(__dirname, 'uploads', 'knowledge.json');

        // 检查文件是否存在并追加内容
        if (fs.existsSync(jsonFilePath2)) {
            fs.appendFileSync(jsonFilePath2, ',\n' + resultText2, 'utf8');
        } else {
            fs.writeFileSync(jsonFilePath2, resultText2, 'utf-8');
        }

        // 返回响应
        res.json({ 
            message: '提取完成！', 
            textFile: `/uploads/experiments_and_attributes.txt`, 
            jsonFile: `/uploads/ontology.json`,
            csvFile: `/uploads/triples.csv`
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

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
