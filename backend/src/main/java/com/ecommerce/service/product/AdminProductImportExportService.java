package com.ecommerce.service.product;

import com.ecommerce.dto.request.AdminProductImportMode;
import com.ecommerce.dto.response.AdminProductImportResult;
import com.ecommerce.dto.response.AdminProductImportRowError;
import com.ecommerce.model.entity.Product;
import com.ecommerce.repository.CategoryRepository;
import com.ecommerce.repository.ProductRepository;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import java.util.Base64;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AdminProductImportExportService {

    private static final String SHEET_NAME = "Products";

    private final ProductRepository productRepository;

    private final CategoryRepository categoryRepository;

    public AdminProductImportExportService(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    public record ExportZip(byte[] bytes, String filename) {}

    public ExportZip exportTemplateZip() {
        try {
            ByteArrayOutputStream zipBytes = new ByteArrayOutputStream();
            try (ZipOutputStream zos = new ZipOutputStream(zipBytes)) {
                byte[] xlsx = buildTemplateXlsx();
                ZipEntry xlsxEntry = new ZipEntry("products.xlsx");
                zos.putNextEntry(xlsxEntry);
                zos.write(xlsx);
                zos.closeEntry();

                // 1x1 png placeholder
                byte[] png = Base64.getDecoder().decode(
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAwMB/ekn2i0AAAAASUVORK5CYII="
                );

                ZipEntry img1 = new ZipEntry("images/sample1.png");
                zos.putNextEntry(img1);
                zos.write(png);
                zos.closeEntry();

                ZipEntry img2 = new ZipEntry("images/sample2.png");
                zos.putNextEntry(img2);
                zos.write(png);
                zos.closeEntry();
            }

            String fname = "products_template.zip";
            return new ExportZip(zipBytes.toByteArray(), fname);
        } catch (Exception e) {
            throw new RuntimeException("Export template failed: " + e.getMessage(), e);
        }
    }

    public ExportZip exportProductsZip(List<Long> productIds) {
        List<Product> products;
        if (productIds != null && !productIds.isEmpty()) {
            products = productRepository.findAllById(productIds);
        } else {
            products = productRepository.findAll();
        }

        try {
            ByteArrayOutputStream zipBytes = new ByteArrayOutputStream();
            try (ZipOutputStream zos = new ZipOutputStream(zipBytes)) {
                byte[] xlsx = buildProductsXlsx(products);
                ZipEntry xlsxEntry = new ZipEntry("products.xlsx");
                zos.putNextEntry(xlsxEntry);
                zos.write(xlsx);
                zos.closeEntry();

                Map<String, String> copiedImages = new HashMap<>();
                for (Product p : products) {
                    if (p == null) continue;
                    List<String> imgs = p.getImages() != null ? p.getImages() : List.of();
                    for (String url : imgs) {
                        if (url == null || url.isBlank()) continue;
                        String rel = normalizeStoredUploadPath(url);
                        if (rel == null) continue;
                        if (copiedImages.containsKey(rel)) continue;
                        Path file = Path.of("uploads").resolve(rel).normalize();
                        if (!Files.exists(file)) continue;
                        String zipPath = "images/" + rel;
                        ZipEntry imgEntry = new ZipEntry(zipPath);
                        zos.putNextEntry(imgEntry);
                        Files.copy(file, zos);
                        zos.closeEntry();
                        copiedImages.put(rel, zipPath);
                    }
                }
            }

            String fname = "products_" + Instant.now().toString().replace(':', '-') + ".zip";
            return new ExportZip(zipBytes.toByteArray(), fname);
        } catch (Exception e) {
            throw new RuntimeException("Export zip failed: " + e.getMessage(), e);
        }
    }

    public AdminProductImportResult importProductsZipOrXlsx(
        MultipartFile file,
        AdminProductImportMode mode,
        List<Long> categoryIds
    ) {
        AdminProductImportResult result = new AdminProductImportResult();
        if (file == null || file.isEmpty()) {
            result.setTotal(0);
            result.setSuccessCount(0);
            result.setErrorCount(1);
            result.setErrors(List.of(new AdminProductImportRowError(0, null, "File trống")));
            return result;
        }

        if (categoryIds == null || categoryIds.isEmpty()) {
            result.setTotal(0);
            result.setSuccessCount(0);
            result.setErrorCount(1);
            result.setErrors(List.of(new AdminProductImportRowError(0, null, "Vui lòng chọn ít nhất 1 danh mục khi import")));
            return result;
        }

        String ct = file.getContentType();
        if (ct == null) ct = "";
        String name = file.getOriginalFilename();
        if (name == null) name = "";
        String lowerName = name.toLowerCase(Locale.ROOT);
        boolean isZip = lowerName.endsWith(".zip") || ct.equalsIgnoreCase("application/zip");
        boolean isXlsx = lowerName.endsWith(".xlsx") ||
            ct.equalsIgnoreCase("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        Map<String, byte[]> zipImages = new HashMap<>();
        byte[] xlsxBytes;

        try {
            if (isZip) {
                try (ZipInputStream zis = new ZipInputStream(file.getInputStream())) {
                    ZipEntry entry;
                    byte[] buffer = new byte[8192];
                    ByteArrayOutputStream xlsxOut = null;
                    while ((entry = zis.getNextEntry()) != null) {
                        String entryName = entry.getName();
                        if (entry.isDirectory()) {
                            zis.closeEntry();
                            continue;
                        }
                        if ("products.xlsx".equalsIgnoreCase(entryName)) {
                            xlsxOut = new ByteArrayOutputStream();
                            int r;
                            while ((r = zis.read(buffer)) > 0) {
                                xlsxOut.write(buffer, 0, r);
                            }
                        } else if (entryName.toLowerCase(Locale.ROOT).startsWith("images/")) {
                            ByteArrayOutputStream imgOut = new ByteArrayOutputStream();
                            int r;
                            while ((r = zis.read(buffer)) > 0) {
                                imgOut.write(buffer, 0, r);
                            }
                            String rel = entryName.substring("images/".length());
                            zipImages.put(rel, imgOut.toByteArray());
                        }
                        zis.closeEntry();
                    }
                    if (xlsxOut == null) {
                        throw new IllegalArgumentException("Không tìm thấy products.xlsx trong file zip");
                    }
                    xlsxBytes = xlsxOut.toByteArray();
                }
            } else if (isXlsx) {
                xlsxBytes = file.getBytes();
            } else {
                throw new IllegalArgumentException("File không hợp lệ. Chỉ nhận .zip hoặc .xlsx");
            }
        } catch (Exception e) {
            result.setTotal(0);
            result.setSuccessCount(0);
            result.setErrorCount(1);
            result.setErrors(List.of(new AdminProductImportRowError(0, null, e.getMessage())));
            return result;
        }

        List<AdminProductImportRowError> errors = new ArrayList<>();
        int total = 0;
        int ok = 0;

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(xlsxBytes))) {
            Sheet sheet = wb.getSheet(SHEET_NAME);
            if (sheet == null) sheet = wb.getSheetAt(0);
            if (sheet == null) throw new IllegalArgumentException("Không có sheet dữ liệu");

            int last = sheet.getLastRowNum();
            for (int i = 1; i <= last; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String sku = getStringCell(row, 0);
                String nameCell = getStringCell(row, 1);
                String slug = getStringCell(row, 2);
                BigDecimal price = getDecimalCell(row, 3);
                BigDecimal oldPrice = getDecimalCell(row, 4);
                Integer stock = getIntCell(row, 5);
                String brand = getStringCell(row, 6);
                String categorySlug = getStringCell(row, 7);
                String description = getStringCell(row, 8);
                String sizesCsv = getStringCell(row, 9);
                String colorsCsv = getStringCell(row, 10);
                String imagesCsv = getStringCell(row, 11);
                Boolean active = getBooleanCell(row, 12);

                boolean emptyRow = (sku == null || sku.isBlank())
                    && (nameCell == null || nameCell.isBlank())
                    && (slug == null || slug.isBlank());
                if (emptyRow) continue;

                total++;

                try {
                    validateRow(mode, sku, nameCell, slug, price, stock);

                    Product product;
                    if (mode == AdminProductImportMode.CREATE) {
                        if (productRepository.existsBySku(sku)) {
                            throw new IllegalArgumentException("Trùng mã sản phẩm (sku)" );
                        }
                        product = new Product();
                        product.setSku(sku);
                    } else {
                        product = productRepository.findBySku(sku)
                            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm để cập nhật theo mã"));
                    }

                    product.setName(nameCell);
                    product.setSlug(slug);
                    product.setPrice(price);
                    product.setOldPrice(oldPrice);
                    product.setStock(stock);
                    product.setBrand(brand != null && !brand.isBlank() ? brand : "FashionHub");
                    product.setCategory(categorySlug);
                    product.setDescription(description);
                    product.setActive(active != null ? active : Boolean.TRUE);

                    if (sizesCsv != null) {
                        product.setSizes(splitCsv(sizesCsv));
                    }
                    if (colorsCsv != null) {
                        product.setColors(splitCsv(colorsCsv));
                    }

                    // Categories: override by popup selection if provided
                    if (categoryIds != null && !categoryIds.isEmpty()) {
                        List<Long> cleaned = categoryIds.stream().filter(Objects::nonNull).distinct().toList();
                        product.setCategoryIds(new ArrayList<>(cleaned));
                        Long firstCategoryId = cleaned.get(0);
                        if (firstCategoryId == null) {
                            throw new IllegalArgumentException("Danh mục được chọn không hợp lệ");
                        }
                        product.setCategoryId(firstCategoryId);

                        String slugFromId = categoryRepository.findById(firstCategoryId)
                            .map(c -> (c.getSlug() != null ? c.getSlug().trim() : null))
                            .orElse(null);
                        if (slugFromId == null || slugFromId.isBlank()) {
                            throw new IllegalArgumentException("Danh mục được chọn không hợp lệ" );
                        }
                        product.setCategory(slugFromId);
                    }

                    if (product.getCategory() == null || product.getCategory().isBlank()) {
                        throw new IllegalArgumentException("Thiếu danh mục" );
                    }

                    // images
                    List<String> images = new ArrayList<>();
                    for (String item : splitCsv(imagesCsv)) {
                        String imgToken = item.trim();
                        if (imgToken.isBlank()) continue;
                        String uploadedUrl = resolveAndStoreImage(imgToken, zipImages);
                        if (uploadedUrl != null && !uploadedUrl.isBlank()) {
                            images.add(uploadedUrl);
                        }
                    }
                    if (!images.isEmpty()) {
                        product.setImages(images);
                        product.setImageUrl(images.get(0));
                    }

                    productRepository.save(product);
                    ok++;
                } catch (Exception ex) {
                    errors.add(new AdminProductImportRowError(i + 1, sku, ex.getMessage()));
                }
            }
        } catch (Exception e) {
            result.setTotal(total);
            result.setSuccessCount(ok);
            result.setErrorCount(errors.size() + 1);
            errors.add(new AdminProductImportRowError(0, null, "Parse excel failed: " + e.getMessage()));
            result.setErrors(errors);
            return result;
        }

        result.setTotal(total);
        result.setSuccessCount(ok);
        result.setErrorCount(errors.size());
        result.setErrors(errors);

        if (!errors.isEmpty()) {
            try {
                String errorFileUrl = writeErrorReport(errors);
                result.setErrorFileUrl(errorFileUrl);
            } catch (Exception ignored) {
            }
        }

        return result;
    }

    private static void validateRow(
        AdminProductImportMode mode,
        String sku,
        String name,
        String slug,
        BigDecimal price,
        Integer stock
    ) {
        if (sku == null || sku.isBlank()) throw new IllegalArgumentException("Thiếu mã sản phẩm (sku)");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("Thiếu tên sản phẩm");
        if (slug == null || slug.isBlank()) throw new IllegalArgumentException("Thiếu slug");
        if (price == null) throw new IllegalArgumentException("Thiếu giá");
        if (stock == null || stock < 0) throw new IllegalArgumentException("Tồn kho không hợp lệ");
        if (mode == null) throw new IllegalArgumentException("Thiếu mode import");
    }

    private static List<String> splitCsv(String csv) {
        if (csv == null) return List.of();
        String s = csv.trim();
        if (s.isEmpty()) return List.of();
        String[] parts = s.split(",");
        List<String> out = new ArrayList<>();
        for (String p : parts) {
            if (p == null) continue;
            String t = p.trim();
            if (!t.isEmpty()) out.add(t);
        }
        return out;
    }

    private static byte[] buildProductsXlsx(List<Product> products) throws Exception {
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet(SHEET_NAME);

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("sku");
            header.createCell(1).setCellValue("name");
            header.createCell(2).setCellValue("slug");
            header.createCell(3).setCellValue("price");
            header.createCell(4).setCellValue("oldPrice");
            header.createCell(5).setCellValue("stock");
            header.createCell(6).setCellValue("brand");
            header.createCell(7).setCellValue("category");
            header.createCell(8).setCellValue("description");
            header.createCell(9).setCellValue("sizes");
            header.createCell(10).setCellValue("colors");
            header.createCell(11).setCellValue("images" );
            header.createCell(12).setCellValue("active");

            int r = 1;
            for (Product p : products) {
                if (p == null) continue;
                Row row = sheet.createRow(r++);
                row.createCell(0).setCellValue(s(p.getSku()));
                row.createCell(1).setCellValue(s(p.getName()));
                row.createCell(2).setCellValue(s(p.getSlug()));
                if (p.getPrice() != null) row.createCell(3).setCellValue(p.getPrice().doubleValue());
                if (p.getOldPrice() != null) row.createCell(4).setCellValue(p.getOldPrice().doubleValue());
                if (p.getStock() != null) row.createCell(5).setCellValue(p.getStock());
                row.createCell(6).setCellValue(s(p.getBrand()));
                row.createCell(7).setCellValue(s(p.getCategory()));
                row.createCell(8).setCellValue(s(p.getDescription()));
                row.createCell(9).setCellValue(String.join(",", p.getSizes() != null ? p.getSizes() : List.of()));
                row.createCell(10).setCellValue(String.join(",", p.getColors() != null ? p.getColors() : List.of()));

                List<String> imageTokens = new ArrayList<>();
                for (String img : (p.getImages() != null ? p.getImages() : List.<String>of())) {
                    if (img == null || img.isBlank()) continue;
                    String rel = normalizeStoredUploadPath(img);
                    if (rel != null) {
                        imageTokens.add(rel);
                    } else {
                        imageTokens.add(img);
                    }
                }

                row.createCell(11).setCellValue(String.join(",", imageTokens));
                row.createCell(12).setCellValue(p.getActive() == null ? true : p.getActive());
            }

            for (int i = 0; i <= 12; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    private static byte[] buildTemplateXlsx() throws Exception {
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet(SHEET_NAME);

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("sku");
            header.createCell(1).setCellValue("name");
            header.createCell(2).setCellValue("slug");
            header.createCell(3).setCellValue("price");
            header.createCell(4).setCellValue("oldPrice");
            header.createCell(5).setCellValue("stock");
            header.createCell(6).setCellValue("brand");
            header.createCell(7).setCellValue("category");
            header.createCell(8).setCellValue("description");
            header.createCell(9).setCellValue("sizes");
            header.createCell(10).setCellValue("colors");
            header.createCell(11).setCellValue("images");
            header.createCell(12).setCellValue("active");

            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue("SPM001");
            r1.createCell(1).setCellValue("Sản phẩm mẫu 1");
            r1.createCell(2).setCellValue("san-pham-mau-1");
            r1.createCell(3).setCellValue(199000);
            r1.createCell(4).setCellValue(249000);
            r1.createCell(5).setCellValue(10);
            r1.createCell(6).setCellValue("FashionHub");
            r1.createCell(7).setCellValue("(chọn danh mục trong popup)");
            r1.createCell(8).setCellValue("Mô tả mẫu");
            r1.createCell(9).setCellValue("S,M,L");
            r1.createCell(10).setCellValue("Đen,Trắng");
            r1.createCell(11).setCellValue("sample1.png,sample2.png");
            r1.createCell(12).setCellValue(true);

            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue("SPM002");
            r2.createCell(1).setCellValue("Sản phẩm mẫu 2");
            r2.createCell(2).setCellValue("san-pham-mau-2");
            r2.createCell(3).setCellValue(299000);
            r2.createCell(4).setCellValue(0);
            r2.createCell(5).setCellValue(5);
            r2.createCell(6).setCellValue("FashionHub");
            r2.createCell(7).setCellValue("(chọn danh mục trong popup)");
            r2.createCell(8).setCellValue("Mô tả mẫu");
            r2.createCell(9).setCellValue("M,L");
            r2.createCell(10).setCellValue("Xanh");
            r2.createCell(11).setCellValue("sample1.png");
            r2.createCell(12).setCellValue(true);

            for (int i = 0; i <= 12; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    private static String s(String v) {
        return v == null ? "" : v;
    }

    private static String getStringCell(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        if (c.getCellType() == CellType.STRING) {
            String s = c.getStringCellValue();
            return s != null ? s.trim() : null;
        }
        if (c.getCellType() == CellType.NUMERIC) {
            double d = c.getNumericCellValue();
            long l = (long) d;
            if (Math.abs(d - l) < 0.0000001) return String.valueOf(l);
            return String.valueOf(d);
        }
        if (c.getCellType() == CellType.BOOLEAN) {
            return String.valueOf(c.getBooleanCellValue());
        }
        return null;
    }

    private static BigDecimal getDecimalCell(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) {
                return BigDecimal.valueOf(c.getNumericCellValue());
            }
            if (c.getCellType() == CellType.STRING) {
                String s = c.getStringCellValue();
                if (s == null || s.trim().isEmpty()) return null;
                return new BigDecimal(s.trim());
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static Integer getIntCell(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) {
                return (int) Math.floor(c.getNumericCellValue());
            }
            if (c.getCellType() == CellType.STRING) {
                String s = c.getStringCellValue();
                if (s == null || s.trim().isEmpty()) return null;
                return Integer.parseInt(s.trim());
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static Boolean getBooleanCell(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.BOOLEAN) return c.getBooleanCellValue();
            if (c.getCellType() == CellType.NUMERIC) return c.getNumericCellValue() != 0;
            if (c.getCellType() == CellType.STRING) {
                String s = c.getStringCellValue();
                if (s == null) return null;
                String t = s.trim().toLowerCase(Locale.ROOT);
                if (t.isEmpty()) return null;
                return t.equals("true") || t.equals("1") || t.equals("yes") || t.equals("y");
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static String normalizeStoredUploadPath(String url) {
        String u = url.trim();
        String prefix = "/api/admin/uploads/";
        int idx = u.indexOf(prefix);
        if (idx >= 0) {
            return u.substring(idx + prefix.length());
        }
        if (!u.contains("/")) {
            return u;
        }
        return null;
    }

    private static String resolveAndStoreImage(String token, Map<String, byte[]> zipImages) {
        try {
            if (token.startsWith("http://") || token.startsWith("https://")) {
                // download
                URL url = URI.create(token).toURL();
                try (InputStream in = url.openStream()) {
                    return storeUploadBytes(in, "remote");
                }
            }

            if (token.startsWith("/api/admin/uploads/")) {
                // already uploaded url
                return token;
            }

            // from zip images folder
            if (zipImages != null) {
                String key = token;
                if (key.startsWith("images/")) key = key.substring("images/".length());
                byte[] bytes = zipImages.get(key);
                if (bytes != null) {
                    return storeUploadBytes(new ByteArrayInputStream(bytes), key);
                }
            }

            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private static String storeUploadBytes(InputStream in, String hintName) throws Exception {
        Path uploadDir = Path.of("uploads");
        Files.createDirectories(uploadDir);

        String safe = (hintName == null ? "image" : hintName).replaceAll("[^a-zA-Z0-9_.-]", "_");
        if (safe.length() > 80) safe = safe.substring(safe.length() - 80);
        String base = UUID.randomUUID().toString().replace("-", "");
        if (!safe.contains(".")) safe = safe + ".jpg";
        Path target = uploadDir.resolve(base + "_" + safe);
        Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        return "/api/admin/uploads/" + target.getFileName().toString();
    }

    private static String writeErrorReport(List<AdminProductImportRowError> errors) throws Exception {
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Errors");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("rowNumber");
            header.createCell(1).setCellValue("productCode");
            header.createCell(2).setCellValue("message");

            int r = 1;
            for (AdminProductImportRowError e : errors) {
                Row row = sheet.createRow(r++);
                row.createCell(0).setCellValue(e.getRowNumber());
                row.createCell(1).setCellValue(e.getProductCode() == null ? "" : e.getProductCode());
                row.createCell(2).setCellValue(e.getMessage() == null ? "" : e.getMessage());
            }

            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);
            sheet.autoSizeColumn(2);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            byte[] bytes = out.toByteArray();

            Path uploadDir = Path.of("uploads");
            Files.createDirectories(uploadDir);
            String fname = "import_errors_" + Instant.now().toString().replace(':', '-') + "_" + UUID.randomUUID().toString().replace("-", "") + ".xlsx";
            Path target = uploadDir.resolve(fname);
            Files.write(target, bytes);
            return "/api/admin/uploads/" + target.getFileName().toString();
        }
    }
}
