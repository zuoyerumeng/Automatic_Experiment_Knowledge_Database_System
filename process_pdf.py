import sys
import os
import numpy as np
from pdf2image import convert_from_path
from paddleocr import PaddleOCR
from PIL import Image

def process_pdf(file_path, output_md_path):
    # 将 PDF 转换为图像
    images = convert_from_path(file_path)
    ocr = PaddleOCR(use_angle_cls=True, lang='ch')

    # 识别图像中的文本
    result_text = ""
    for image in images:
        # 将 PIL 图像转换为 numpy 数组
        image_np = np.array(image)
        result = ocr.ocr(image_np, cls=True)
        for line in result:
            result_text += ''.join([word_info[1][0] for word_info in line]) + '\n'

    # 将识别结果保存为 Markdown 文件
    with open(output_md_path, 'w', encoding='utf-8') as f:
        f.write(result_text)

if __name__ == "__main__":
    file_path = sys.argv[1]
    output_md_path = sys.argv[2]
    process_pdf(file_path, output_md_path)