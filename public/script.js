document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const fileInput = document.getElementById('fileInput');
    const statusMessage = document.getElementById('statusMessage');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    statusMessage.textContent = '正在上传...';
    statusMessage.style.display = 'block';

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        statusMessage.style.display = 'block';
        if (data.markdownFile) {
            statusMessage.textContent = '上传成功！';
            const link = document.createElement('a');
            link.href = data.markdownFile;
            link.download = 'OCR.md';
            link.textContent = '下载识别出的Markdown文件';
            document.body.appendChild(link);
        } else if (data.jsonFile) {
            statusMessage.textContent = '上传成功！';
            const link = document.createElement('a');
            link.href = data.jsonFile;
            link.download = 'data.json';
            link.textContent = '下载上传的JSON文件';
            document.body.appendChild(link);
        } else {
            alert('上传失败，请重试。');
            statusMessage.style.display = 'none';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('上传失败，请重试。');
        statusMessage.style.display = 'none';
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const markdownInput = document.getElementById('markdownInput');
    const submitMarkdownButton = document.getElementById('submitMarkdown');
    const statusMessage = document.getElementById('statusMessage');

    uploadForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.markdownFile) {
                statusMessage.textContent = '上传成功！请输入并提交实验单元对应的Markdown文本。';
                statusMessage.style.display = 'block';
                markdownInput.style.display = 'block';
                submitMarkdownButton.style.display = 'block';
            } else {
                alert('上传失败，请重试。');
                statusMessage.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('上传失败，请重试。');
            statusMessage.style.display = 'none';
        });
    });

    submitMarkdownButton.addEventListener('click', function () {
        const markdownText = markdownInput.value;
        statusMessage.textContent = '正在提取三元组...';
        statusMessage.style.display = 'block';

        fetch('/submit-markdown', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ markdown: markdownText })
        })
        .then(response => response.json())
        .then(data => {
            if (data.jsonFile) {
                statusMessage.textContent = '提取完成！';
                const link = document.createElement('a');
                link.href = data.jsonFile;
                link.download = 'data.json';
                link.textContent = '下载提取出的实验步骤本体信息和实体名称的JSON文件';
                document.body.appendChild(link);
            } else {
                alert('提取失败，请重试。');
                statusMessage.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('提取成功！');
            statusMessage.style.display = 'none';
        });
    });
});
