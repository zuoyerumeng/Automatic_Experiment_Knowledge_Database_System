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
                                downloadLink.textContent = '2. 下载识别出的Markdown文件';
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