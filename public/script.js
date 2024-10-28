document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('fileInput');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = '正在上传...';
    statusMessage.style.display = 'block';

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === '上传成功！') {
            alert(data.message);
            // 显示“正在识别markdown...”提示
            statusMessage.textContent = '正在识别markdown...';

            // 移除之前的下载链接
            const existingLink = document.querySelector('.download-link');
            if (existingLink) {
                existingLink.remove();
            }

            if (data.markdownFile) {
                // 轮询检查文件是否生成
                const checkFileInterval = setInterval(() => {
                    fetch(data.markdownFile, { method: 'HEAD' })
                        .then(response => {
                            if (response.ok) {
                                clearInterval(checkFileInterval);
                                statusMessage.style.display = 'none';
                                const downloadLink = document.createElement('a');
                                downloadLink.href = data.markdownFile;
                                downloadLink.download = data.markdownFile.split('/').pop();
                                downloadLink.textContent = '下载识别出的Markdown文件';
                                downloadLink.className = 'download-link';
                                document.body.appendChild(downloadLink);
                            }
                        });
                }, 1000);
            }
        } else {
            statusMessage.textContent = data.message;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        statusMessage.textContent = '上传失败，请重试。';
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
                statusMessage.textContent = '上传成功！请在下方输入框中提交Markdown文本。';
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
                link.download = 'triples.json';
                link.textContent = '下载提取出的三元组JSON文件';
                document.body.appendChild(link);
            } else {
                alert('提取失败，请重试。');
                statusMessage.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('提取失败，请重试。');
            statusMessage.style.display = 'none';
        });
    });
});
