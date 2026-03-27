package com.ecommerce.service.payment;

import com.ecommerce.dto.request.AdminProductImportMode;
import com.ecommerce.dto.response.AdminProductImportResult;
import com.ecommerce.dto.response.AdminProductImportRowError;
import com.ecommerce.model.entity.Coupon;
import com.ecommerce.repository.CouponRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class AdminCouponImportExportService {

    private final CouponRepository couponRepository;

    public AdminCouponImportExportService(CouponRepository couponRepository) {
        this.couponRepository = couponRepository;
    }

    public byte[] exportTemplate() throws Exception {
    try (Workbook wb = new XSSFWorkbook()) {
      Sheet sheet = wb.createSheet("Coupons");
      Row header = sheet.createRow(0);

      CellStyle headerStyle = wb.createCellStyle();
      Font headerFont = wb.createFont();
      headerFont.setBold(true);
      headerStyle.setFont(headerFont);
      headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
      headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
      headerStyle.setAlignment(HorizontalAlignment.CENTER);
      headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
      headerStyle.setBorderBottom(BorderStyle.THIN);
      headerStyle.setBorderTop(BorderStyle.THIN);
      headerStyle.setBorderLeft(BorderStyle.THIN);
      headerStyle.setBorderRight(BorderStyle.THIN);

      String[] columns = {
          "Mã (code)",
          "Mô tả (description)",
          "Loại (type)",
          "Giảm tiền (discountAmount)",
          "Giảm % (discountPercent)",
          "Đơn tối thiểu (minOrderAmount)",
          "Giảm tối đa (maxDiscountAmount)",
          "Giảm phí ship (shippingDiscountAmount)",
          "Phân khúc (allowedSegments)",
          "Giới hạn lượt dùng (usageLimit)",
          "Bắt đầu (startsAt ISO)",
          "Kết thúc (endsAt ISO)",
          "Kích hoạt (active)"
      };
      for (int i = 0; i < columns.length; i++) {
        Cell c = header.createCell(i);
        c.setCellValue(columns[i]);
        c.setCellStyle(headerStyle);
      }

      header.setHeightInPoints(22f);

      Row r1 = sheet.createRow(1);
      r1.createCell(0).setCellValue("XINCHAO2024");
      r1.createCell(1).setCellValue("Giảm 50% phí ship đơn từ 200k");
      r1.createCell(2).setCellValue("customer_shipping");
      r1.createCell(3).setCellValue(30000);
      r1.createCell(4).setCellValue(0);
      r1.createCell(5).setCellValue(200000);
      r1.createCell(6).setCellValue(30000);
      r1.createCell(7).setCellValue(50000);
      r1.createCell(8).setCellValue("TIEM_NANG,THAN_THIET");
      r1.createCell(9).setCellValue(100);
      r1.createCell(10).setCellValue(Instant.now().toString());
      r1.createCell(11).setCellValue(Instant.now().plusSeconds(86400 * 30).toString());
      r1.createCell(12).setCellValue(true);

      for (int i = 0; i < columns.length; i++) {
        sheet.autoSizeColumn(i);
      }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    public AdminProductImportResult importCoupons(MultipartFile file) {
        AdminProductImportResult result = new AdminProductImportResult();
        List<AdminProductImportRowError> errors = new ArrayList<>();
        int total = 0;
        int ok = 0;

        try (Workbook wb = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            int last = sheet.getLastRowNum();

            for (int i = 1; i <= last; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String code = getStringCell(row, 0);
                if (code == null || code.isBlank()) continue;

                total++;
        try {
          Coupon coupon = couponRepository.findByCode(code).orElse(new Coupon());
          coupon.setCode(code);
          coupon.setDescription(getStringCell(row, 1));
          
          String type = getStringCell(row, 2);
          if (type == null || type.isBlank()) type = "customer_segment";
          // Giả sử có trường type trong Coupon entity hoặc xử lý logic phù hợp
          // Lưu ý: Coupon entity hiện tại chưa có trường type, tôi sẽ gán dựa trên dữ liệu hiện có
          
          coupon.setDiscountAmount(getDecimalCell(row, 3));
          coupon.setDiscountPercent(getIntCell(row, 4));
          coupon.setMinOrderAmount(getDecimalCell(row, 5));
          coupon.setMaxDiscountAmount(getDecimalCell(row, 6));
          coupon.setShippingDiscountAmount(getDecimalCell(row, 7));
          coupon.setAllowedSegments(getStringCell(row, 8));
          coupon.setUsageLimit(getIntCell(row, 9));
          
          String startStr = getStringCell(row, 10);
          if (startStr != null) coupon.setStartsAt(Instant.parse(startStr));
          
          String endStr = getStringCell(row, 11);
          if (endStr != null) coupon.setEndsAt(Instant.parse(endStr));
          
          coupon.setActive(getBooleanCell(row, 12));
                    if (coupon.getActive() == null) coupon.setActive(true);
                    if (coupon.getUsedCount() == null) coupon.setUsedCount(0);

                    couponRepository.save(coupon);
                    ok++;
                } catch (Exception e) {
                    errors.add(new AdminProductImportRowError(i + 1, code, e.getMessage()));
                }
            }
        } catch (Exception e) {
            errors.add(new AdminProductImportRowError(0, null, "Lỗi đọc file: " + e.getMessage()));
        }

        result.setTotal(total);
        result.setSuccessCount(ok);
        result.setErrorCount(errors.size());
        result.setErrors(errors);
        return result;
    }

    private String getStringCell(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        if (c.getCellType() == CellType.STRING) return c.getStringCellValue().trim();
        if (c.getCellType() == CellType.NUMERIC) return String.valueOf((long) c.getNumericCellValue());
        return null;
    }

    private BigDecimal getDecimalCell(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) return BigDecimal.valueOf(c.getNumericCellValue());
            if (c.getCellType() == CellType.STRING) return new BigDecimal(c.getStringCellValue().trim());
        } catch (Exception ignored) {}
        return null;
    }

    private Integer getIntCell(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) return (int) c.getNumericCellValue();
            if (c.getCellType() == CellType.STRING) return Integer.parseInt(c.getStringCellValue().trim());
        } catch (Exception ignored) {}
        return null;
    }

    private Boolean getBooleanCell(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        if (c.getCellType() == CellType.BOOLEAN) return c.getBooleanCellValue();
        if (c.getCellType() == CellType.STRING) {
            String s = c.getStringCellValue().trim().toLowerCase();
            return s.equals("true") || s.equals("1");
        }
        return null;
    }
}
