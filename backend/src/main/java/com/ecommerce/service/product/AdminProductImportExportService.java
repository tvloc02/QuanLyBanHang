package com.ecommerce.service.product;

import com.ecommerce.dto.request.AdminProductImportMode;
import com.ecommerce.dto.response.AdminProductImportResult;
import com.ecommerce.dto.response.AdminProductImportRowError;
import com.ecommerce.model.entity.Branch;
import com.ecommerce.model.entity.BranchProductStock;
import com.ecommerce.model.entity.BranchProductVariantStock;
import com.ecommerce.model.entity.Product;
import com.ecommerce.repository.BranchProductStockRepository;
import com.ecommerce.repository.BranchProductVariantStockRepository;
import com.ecommerce.repository.BranchRepository;
import com.ecommerce.repository.CategoryRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.model.entity.ProductType;
import com.ecommerce.model.entity.ProductVariant;
import com.ecommerce.model.entity.ProductVariantSizeStock;
import com.ecommerce.repository.ProductTypeRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.zip.ZipOutputStream;
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

    private final BranchRepository branchRepository;

    private final BranchProductStockRepository branchProductStockRepository;

    private final BranchProductVariantStockRepository branchProductVariantStockRepository;

    private final CategoryRepository categoryRepository;

    private final ProductTypeRepository productTypeRepository;

    private final ObjectMapper objectMapper;

    public AdminProductImportExportService(
        ProductRepository productRepository,
        BranchRepository branchRepository,
        BranchProductStockRepository branchProductStockRepository,
        BranchProductVariantStockRepository branchProductVariantStockRepository,
        CategoryRepository categoryRepository,
        ProductTypeRepository productTypeRepository,
        ObjectMapper objectMapper
    ) {
        this.productRepository = productRepository;
        this.branchRepository = branchRepository;
        this.branchProductStockRepository = branchProductStockRepository;
        this.branchProductVariantStockRepository = branchProductVariantStockRepository;
        this.categoryRepository = categoryRepository;
        this.productTypeRepository = productTypeRepository;
        this.objectMapper = objectMapper;
    }

    public record ExportZip(byte[] bytes, String filename) {}

    public ExportZip exportTemplateZip() {
        return exportTemplateZip(null);
    }

    public ExportZip exportTemplateZip(Long productTypeId) {
        try {
            ByteArrayOutputStream zipBytes = new ByteArrayOutputStream();
            try (ZipOutputStream zos = new ZipOutputStream(zipBytes)) {
                byte[] xlsx = buildTemplateXlsx(productTypeId);
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
                        Path file = Paths.get("uploads").resolve(rel).normalize();
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
        return importProductsZipOrXlsx(file, mode, categoryIds, null);
    }

    public AdminProductImportResult importProductsZipOrXlsx(
        MultipartFile file,
        AdminProductImportMode mode,
        List<Long> categoryIds,
        Long defaultProductTypeId
    ) {
        AdminProductImportResult result = new AdminProductImportResult();
        List<AdminProductImportRowError> errors = new ArrayList<>(); // Đưa lên scope cao nhất
        
        String contentType = file.getContentType();
        if (contentType == null) contentType = "";
        String originalName = file.getOriginalFilename();
        if (originalName == null) originalName = "";
        String fileName = originalName; // Thêm biến này
        String lowerName = originalName.toLowerCase(Locale.ROOT);
        if (file == null || file.isEmpty()) {
            result.setTotal(0);
            result.setSuccessCount(0);
            result.setErrorCount(1);
            result.setErrors(List.of(new AdminProductImportRowError(0, null, "File trống")));
            return result;
        }

        if (categoryIds == null || categoryIds.isEmpty()) {
            // Bỏ qua validation danh mục - cho phép import/tạo sản phẩm mà không cần danh mục
            // result.setTotal(0);
            // result.setSuccessCount(0);
            // result.setErrorCount(1);
            // result.setErrors(List.of(new AdminProductImportRowError(0, null, "Vui lòng chọn ít nhất 1 danh mục khi import")));
            // return result;
        }

        boolean isZip = lowerName.endsWith(".zip") || contentType.equalsIgnoreCase("application/zip");
        boolean isXlsx = lowerName.endsWith(".xlsx") ||
            contentType.equalsIgnoreCase("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        Map<String, byte[]> zipImages = new HashMap<>();
        byte[] xlsxBytes = null; // Khởi tạo ban đầu

        // Khai báo biến last* ở đây để dùng cho cả Excel và CSV
        String lastSku = null;
        String lastName = null;
        String lastSlug = null;
        BigDecimal lastPrice = null;
        String lastBrand = null;
        String lastProductTypeCode = null;
        String lastBranchCode = null;
        String lastProductCode = null;
        BigDecimal lastWeight = null;
        String lastColor = null;
        String lastGender = null;

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

        int totalCount = 0;
        int ok = 0;

        // cache total stock by (branchId|productId)
        Map<String, Integer> branchProductTotalStock = new HashMap<>();

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(xlsxBytes))) {
            Sheet sheet = wb.getSheet(SHEET_NAME);
            if (sheet == null) sheet = wb.getSheetAt(0);
            if (sheet == null) throw new IllegalArgumentException("Không có sheet dữ liệu");

            int lastRowIdx = sheet.getLastRowNum();
            for (int i = 2; i <= lastRowIdx; i++) { // Bắt đầu từ dòng 2 để bỏ qua header
                Row row = sheet.getRow(i);
                if (row == null) continue;

                // Đọc cột theo cấu trúc file Excel thực tế (từ ảnh)
                String stt = getStringCell(row, 0); // Cột A: STT (có thể là NUMERIC)
                String productCode = getStringCell(row, 1); // Cột B: Mã SP (SKU có sẵn)
                String nameCell = getStringCell(row, 2); // Cột C: Tên SP
                String slug = getStringCell(row, 3); // Cột D: Đường dẫn
                String brand = getStringCell(row, 4); // Cột E: Thương hiệu
                String branchCode = getStringCell(row, 5); // Cột F: Kho
                String size = getStringCell(row, 6); // Cột G: Size
                BigDecimal weight = getDecimalCell(row, 7); // Cột H: Cân nặng
                String color = getStringCell(row, 8); // Cột I: Màu sắc
                String gender = getStringCell(row, 9); // Cột J: Giới tính
                Integer rowStock = getIntCell(row, 10); // Cột K: Số lượng
                BigDecimal price = getDecimalCell(row, 11); // Cột L: Giá bán
                
                // Debug: In ra dòng đầu tiên (dữ liệu thực tế) để kiểm tra chi tiết
                // if (i == 2) {
                //     System.out.println("DEBUG - Dòng 2 (dữ liệu thực tế) chi tiết:");
                //     for (int col = 0; col <= 11; col++) {
                //         Cell cell = row.getCell(col);
                //         String value = getStringCell(row, col);
                //         String type = cell != null ? cell.getCellType().toString() : "NULL";
                //         System.out.println("  Cột " + col + ": Type=" + type + ", Value=" + value);
                //     }
                // }
                
                // Nếu không có productTypeCode, lấy 4 ký tự đầu từ productCode
                String productTypeCode = productCode;
                if (productCode != null && productCode.length() >= 4) {
                    productTypeCode = productCode.substring(0, 4);
                }

                // Kế thừa dữ liệu từ dòng trước nếu ô hiện tại trống (xử lý merger)
                if (stt != null && !stt.isBlank()) {
                    lastSku = stt;
                    lastName = nameCell;
                    lastSlug = slug;
                    lastBrand = brand;
                    lastProductTypeCode = productTypeCode;
                    lastPrice = price;
                    lastBranchCode = branchCode;
                    lastWeight = weight;
                    lastColor = color;
                    lastGender = gender;
                } else {
                    stt = lastSku;
                    if (nameCell == null || nameCell.isBlank()) nameCell = lastName;
                    if (slug == null || slug.isBlank()) slug = lastSlug;
                    if (brand == null || brand.isBlank()) brand = lastBrand;
                    if (productTypeCode == null || productTypeCode.isBlank()) productTypeCode = lastProductTypeCode;
                    if (price == null) price = lastPrice;
                    if (branchCode == null || branchCode.isBlank()) branchCode = lastBranchCode;
                    if (weight == null) weight = lastWeight;
                    if (color == null || color.isBlank()) color = lastColor;
                    if (gender == null || gender.isBlank()) gender = lastGender;
                }

                // Cập nhật giá trị kế thừa cho dòng sau
                lastSku = stt;
                lastName = nameCell;
                lastSlug = slug;
                lastBrand = brand;
                lastProductTypeCode = productTypeCode;
                lastPrice = price;
                lastBranchCode = branchCode;
                lastWeight = weight;
                lastColor = color;
                lastGender = gender;

                try {
                    // Debug: In ra dòng đầu tiên (dữ liệu thực tế) để kiểm tra chi tiết
                    if (i == 2) {
                        System.out.println("DEBUG - Bắt đầu xử lý dòng 2:");
                        System.out.println("  STT=" + stt + ", SKU=" + productCode + ", Name=" + nameCell + ", Branch=" + branchCode);
                    }
                    
                    // Debug thêm: Kiểm tra vài dòng khác để xem cấu trúc
                    if (i == 3 || i == 4 || i == 5) {
                        System.out.println("DEBUG - Dòng " + i + " (merge):");
                        System.out.println("  STT=" + stt + ", SKU=" + productCode + ", Name=" + nameCell + ", Size=" + size + ", Color=" + color + ", Stock=" + rowStock);
                    }
                    
                    // Với cấu trúc merge: xử lý cả dòng chính và dòng merge
                    // Dòng chính: có STT và SKU, dòng merge: kế thừa từ dòng chính
                    boolean isMainLine = (stt != null && !stt.isBlank() && productCode != null && !productCode.isBlank());
                    
                    if (!isMainLine) {
                        // Dòng merge: kế thừa thông tin từ dòng trước
                        stt = lastSku;
                        productCode = lastProductCode;
                        nameCell = lastName;
                        slug = lastSlug;
                        brand = lastBrand;
                        branchCode = lastBranchCode;
                        weight = lastWeight;
                        color = lastColor;
                        gender = lastGender;
                        price = lastPrice;
                    }
                    
                    if (productCode == null || productCode.isBlank()) {
                        System.out.println("INFO - Bỏ qua dòng " + i + " vì không thể xác định SKU");
                        continue;
                    }

                    totalCount++;

                    String sku = productCode; // Khai báo ngoài try block
                    try {
                        // Dùng productCode có sẵn từ Excel, không tạo mới
                        
                        // Nới lỏng validateRow để chấp nhận dòng merger
                        // validateRow(mode, sku, nameCell, slug, price, stock); 
                        if (sku == null || sku.isBlank()) throw new IllegalArgumentException("Thiếu STT/Mã");
                        if (nameCell == null || nameCell.isBlank()) throw new IllegalArgumentException("Thiếu tên sản phẩm");

                        Product product;
                        boolean isNewProduct = false;
                        var existing = productRepository.findBySku(sku);
                        if (existing.isPresent()) {
                            product = existing.get();
                        } else {
                            product = new Product();
                            product.setSku(sku);
                            isNewProduct = true;
                        }

                    product.setName(nameCell);
                    product.setSlug(slug != null && !slug.isBlank() ? slug : slugify(nameCell));
                    product.setPrice(price != null ? price : BigDecimal.ZERO);
                    product.setBrand(brand != null && !brand.isBlank() ? brand : "FashionHub");
                    product.setActive(true);
                    
                    // Thêm các trường mới
                    if (weight != null) {
                        product.setWeightKg(weight.doubleValue());
                    }
                    if (gender != null && !gender.isBlank()) {
                        product.setGender(gender.trim());
                    }
                    
                    // Khởi tạo/Cập nhật trường category (không để null)
                    product.setCategory("Uncategorized");

                    // Sử dụng isNewProduct để tránh cảnh báo lint và gán tồn kho ban đầu
                    if (isNewProduct) {
                        product.setStock(0);
                    }

                    // Xử lý Loại sản phẩm
                    if (productTypeCode != null && !productTypeCode.isBlank()) {
                        productTypeRepository.findByCode(productTypeCode.trim())
                            .ifPresent(pt -> product.setProductTypeId(pt.getId()));
                    }

                    // Xử lý Biến thể (Size, Color, Stock)
                    if (color != null && !color.isBlank() && size != null && !size.isBlank()) {
                        List<ProductVariant> variants = product.getVariants();
                        if (variants == null) {
                            variants = new ArrayList<>();
                            product.setVariants(variants);
                        }

                        final String targetColor = color.trim();
                        ProductVariant variant = variants.stream()
                            .filter(v -> targetColor.equalsIgnoreCase(v.getColor()))
                            .findFirst()
                            .orElseGet(() -> {
                                ProductVariant v = new ProductVariant();
                                v.setProduct(product);
                                v.setColor(targetColor);
                                v.setPrice(product.getPrice());
                                v.setActive(true);
                                product.getVariants().add(v);
                                return v;
                            });

                        List<ProductVariantSizeStock> stocks = variant.getStocks();
                        if (stocks == null) {
                            stocks = new ArrayList<>();
                            variant.setStocks(stocks);
                        }

                        final String targetSize = size.trim();
                        ProductVariantSizeStock sizeStock = stocks.stream()
                            .filter(s -> targetSize.equalsIgnoreCase(s.getSize()))
                            .findFirst()
                            .orElseGet(() -> {
                                ProductVariantSizeStock s = new ProductVariantSizeStock(targetSize, 0);
                                variant.getStocks().add(s);
                                return s;
                            });
                        
                        sizeStock.setStock(rowStock != null ? rowStock : 0);

                        // Tính lại tổng tồn kho
                        int totalStock = product.getVariants().stream()
                            .flatMap(v -> v.getStocks().stream())
                            .mapToInt(s -> s.getStock() != null ? s.getStock() : 0)
                            .sum();
                        product.setStock(totalStock);
                    }

                    Product savedProduct = productRepository.save(product);
                    final Long savedProductId = savedProduct.getId(); // Tạo bản sao final để dùng trong lambda

                    // Upsert tồn kho theo chi nhánh để UI ma trận size đọc được
                    Long branchId = resolveBranchIdByCode(branchCode);
                    if (branchId != null && color != null && !color.isBlank() && size != null && !size.isBlank()) {
                        String c = color.trim();
                        String s = size.trim();
                        int newStock = rowStock != null ? rowStock : 0;
                        if (newStock < 0) newStock = 0;

                        BranchProductVariantStock bpvs = branchProductVariantStockRepository
                            .findByBranchIdAndProductIdAndColorAndSize(branchId, savedProductId, c, s)
                            .orElseGet(() -> {
                                BranchProductVariantStock x = new BranchProductVariantStock();
                                x.setBranchId(branchId);
                                x.setProductId(savedProductId);
                                x.setColor(c);
                                x.setSize(s);
                                return x;
                            });

                        int prev = bpvs.getStock() != null ? bpvs.getStock() : 0;
                        bpvs.setStock(newStock);
                        // giữ imageUrl null (chưa mapping từ excel)
                        branchProductVariantStockRepository.save(bpvs);

                        String k = branchId + "|" + savedProductId;
                        int currentTotal;
                        if (branchProductTotalStock.containsKey(k)) {
                            currentTotal = branchProductTotalStock.getOrDefault(k, 0);
                        } else {
                            currentTotal = branchProductStockRepository
                                .findByBranchIdAndProductId(branchId, savedProductId)
                                .map(x -> x.getStock() != null ? x.getStock() : 0)
                                .orElse(0);
                        }
                        currentTotal = currentTotal - Math.max(0, prev) + Math.max(0, newStock);
                        branchProductTotalStock.put(k, currentTotal);

                        BranchProductStock bps = branchProductStockRepository
                            .findByBranchIdAndProductId(branchId, savedProductId)
                            .orElseGet(() -> {
                                BranchProductStock x = new BranchProductStock();
                                x.setBranchId(branchId);
                                x.setProductId(savedProductId);
                                return x;
                            });
                        bps.setStock(currentTotal);
                        branchProductStockRepository.save(bps);
                    }

                    ok++;
                    } catch (Exception ex) {
                        System.out.println("ERROR - Lỗi xử lý dòng " + i + ": " + ex.getMessage());
                        ex.printStackTrace();
                        errors.add(new AdminProductImportRowError(i + 1, sku, ex.getMessage()));
                    }
                } catch (Exception ex) {
                    System.out.println("ERROR - Lỗi ngoài vòng lặp: " + ex.getMessage());
                    ex.printStackTrace();
                }
            }
        } catch (Exception e) {
            result.setTotal(totalCount);
            result.setSuccessCount(ok);
            result.setErrorCount(errors.size() + 1);
            errors.add(new AdminProductImportRowError(0, null, "Parse excel failed: " + e.getMessage()));
            result.setErrors(errors);
            return result;
        }

        result.setTotal(totalCount);
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

    private byte[] buildProductsXlsx(List<Product> products) throws Exception {
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
            header.createCell(9).setCellValue("productTypeCode");
            header.createCell(10).setCellValue("gender");
            header.createCell(11).setCellValue("attributesJson");
            header.createCell(12).setCellValue("sizes");
            header.createCell(13).setCellValue("colors");
            header.createCell(14).setCellValue("images" );
            header.createCell(15).setCellValue("active");

            int r = 1;
            Map<Long, String> productTypeCodeCache = new HashMap<>();
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
                String ptCode = "";
                Long ptIdBox = p.getProductTypeId();
                if (ptIdBox != null) {
                    Long ptId = Long.valueOf(ptIdBox.longValue());
                    ptCode = productTypeCodeCache.computeIfAbsent(ptId, (k) ->
                        productTypeRepository.findById(Objects.requireNonNull(k)).map(ProductType::getCode).orElse("")
                    );
                }
                row.createCell(9).setCellValue(ptCode);
                row.createCell(10).setCellValue(s(p.getGender()));
                row.createCell(11).setCellValue(s(p.getAttributesJson()));
                row.createCell(12).setCellValue(String.join(",", p.getSizes() != null ? p.getSizes() : List.of()));
                row.createCell(13).setCellValue(String.join(",", p.getColors() != null ? p.getColors() : List.of()));

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

                row.createCell(14).setCellValue(String.join(",", imageTokens));
                row.createCell(15).setCellValue(p.getActive() == null ? true : p.getActive());
            }

            for (int i = 0; i <= 15; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    private byte[] buildTemplateXlsx(Long productTypeId) throws Exception {
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet(SHEET_NAME);
            Sheet guideSheet = wb.createSheet("HuongDan");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("STT");
            header.createCell(1).setCellValue("Loai san pham (code 4 ky tu)");
            header.createCell(2).setCellValue("Ten san pham");
            header.createCell(3).setCellValue("Duong dan (slug)");
            header.createCell(4).setCellValue("Thuong hieu");
            header.createCell(5).setCellValue("Ma chi nhanh (branchCode)");
            header.createCell(6).setCellValue("Size");
            header.createCell(7).setCellValue("Can nang (kg)");
            header.createCell(8).setCellValue("Mau sac");
            header.createCell(9).setCellValue("Gioi tinh");
            header.createCell(10).setCellValue("So luong");
            header.createCell(11).setCellValue("Gia ban");

            String ptCode = "";
            if (productTypeId != null) {
                ptCode = productTypeRepository.findById(productTypeId)
                    .map(ProductType::getCode)
                    .orElse("");
            }

            if (ptCode == null) ptCode = "";
            ptCode = ptCode.trim();
            if (ptCode.length() > 4) ptCode = ptCode.substring(0, 4);

            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue(1);
            r1.createCell(1).setCellValue(ptCode.isEmpty() ? "A001" : ptCode);
            r1.createCell(2).setCellValue("Ao so mi nam phong cach");
            r1.createCell(3).setCellValue("ao-so-mi-nam-phong-cach");
            r1.createCell(4).setCellValue("L.event");
            r1.createCell(5).setCellValue("HN");
            r1.createCell(6).setCellValue("S");
            r1.createCell(7).setCellValue(0.1);
            r1.createCell(8).setCellValue("Trang");
            r1.createCell(9).setCellValue("Nam");
            r1.createCell(10).setCellValue(10);
            r1.createCell(11).setCellValue(250000);

            // Dòng tiếp theo cùng sản phẩm: để trống STT để mô phỏng merge-cell, chỉ thay đổi Size/Stock
            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue("");
            r2.createCell(1).setCellValue("");
            r2.createCell(2).setCellValue("");
            r2.createCell(3).setCellValue("");
            r2.createCell(4).setCellValue("");
            r2.createCell(5).setCellValue("");
            r2.createCell(6).setCellValue("M");
            r2.createCell(7).setCellValue(0.15);
            r2.createCell(8).setCellValue("Trang");
            r2.createCell(9).setCellValue("Nam");
            r2.createCell(10).setCellValue(10);
            r2.createCell(11).setCellValue(250000);

            // Dòng thứ 3: cùng sản phẩm, khác màu (và size)
            Row r3 = sheet.createRow(3);
            r3.createCell(0).setCellValue("");
            r3.createCell(1).setCellValue("");
            r3.createCell(2).setCellValue("");
            r3.createCell(3).setCellValue("");
            r3.createCell(4).setCellValue("");
            r3.createCell(5).setCellValue("");
            r3.createCell(6).setCellValue("L");
            r3.createCell(7).setCellValue(0.25);
            r3.createCell(8).setCellValue("Xanh");
            r3.createCell(9).setCellValue("Nam");
            r3.createCell(10).setCellValue(8);
            r3.createCell(11).setCellValue(250000);

            for (int i = 0; i <= 11; i++) {
                sheet.autoSizeColumn(i);
            }

            int gr = 0;
            Row g0 = guideSheet.createRow(gr++);
            g0.createCell(0).setCellValue("HUONG DAN NHAP SAN PHAM (IMPORT PRODUCT VARIANTS)");

            Row g1 = guideSheet.createRow(gr++);
            g1.createCell(0).setCellValue("1) Ma san pham (SKU) tu dong tao khi import");
            Row g2 = guideSheet.createRow(gr++);
            g2.createCell(0).setCellValue("- SKU co do dai 10 ky tu = [Ma loai san pham 4 ky tu] + [STT 6 so (padding 0)]");
            Row g3 = guideSheet.createRow(gr++);
            g3.createCell(0).setCellValue("- Vi du: productTypeCode=A001, STT=1 => SKU=A001000001");
            Row g4 = guideSheet.createRow(gr++);
            g4.createCell(0).setCellValue("- Luu y: Cac dong bien the (size/mau) cua cung 1 san pham co the de trong cot STT (import se ke thua tu dong tren)");

            gr++;

            Row gb0 = guideSheet.createRow(gr++);
            gb0.createCell(0).setCellValue("2) Danh sach ma chi nhanh (Branch.code) - dien vao cot 'Ma chi nhanh (branchCode)'");
            Row gbh = guideSheet.createRow(gr++);
            gbh.createCell(0).setCellValue("branchId");
            gbh.createCell(1).setCellValue("branchCode");
            gbh.createCell(2).setCellValue("branchName");
            List<Branch> branches = branchRepository.findAll();
            branches.sort((a, b) -> {
                String ac = a != null && a.getCode() != null ? a.getCode() : "";
                String bc = b != null && b.getCode() != null ? b.getCode() : "";
                return ac.compareToIgnoreCase(bc);
            });
            for (Branch b : branches) {
                if (b == null) continue;
                Row r = guideSheet.createRow(gr++);
                if (b.getId() != null) r.createCell(0).setCellValue(b.getId());
                r.createCell(1).setCellValue(s(b.getCode()));
                r.createCell(2).setCellValue(s(b.getName()));
            }

            gr++;

            Row gp0 = guideSheet.createRow(gr++);
            gp0.createCell(0).setCellValue("3) Danh sach ma loai san pham (ProductType.code) - dien vao cot 'Loai san pham (code 4 ky tu)'");
            Row gph = guideSheet.createRow(gr++);
            gph.createCell(0).setCellValue("productTypeId");
            gph.createCell(1).setCellValue("productTypeCode");
            gph.createCell(2).setCellValue("productTypeName");
            List<ProductType> productTypes = productTypeRepository.findAll();
            productTypes.sort((a, b) -> {
                String ac = a != null && a.getCode() != null ? a.getCode() : "";
                String bc = b != null && b.getCode() != null ? b.getCode() : "";
                return ac.compareToIgnoreCase(bc);
            });
            for (ProductType p : productTypes) {
                if (p == null) continue;
                Row r = guideSheet.createRow(gr++);
                if (p.getId() != null) r.createCell(0).setCellValue(p.getId());
                r.createCell(1).setCellValue(s(p.getCode()));
                r.createCell(2).setCellValue(s(p.getName()));
            }

            for (int i = 0; i <= 8; i++) {
                guideSheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    private List<String> getDynamicFields(Long productTypeId) {
        if (productTypeId == null) return List.of();
        return productTypeRepository.findById(productTypeId).map(pt -> {
            try {
                String fieldsJson = pt.getFieldsJson();
                if (fieldsJson == null || fieldsJson.isBlank()) return List.<String>of();
                Map<String, Object> map = objectMapper.readValue(fieldsJson, new TypeReference<>() {});
                List<Map<String, Object>> fields = (List<Map<String, Object>>) map.get("fields");
                if (fields == null) return List.<String>of();
                return fields.stream()
                    .map(f -> (String) f.get("name"))
                    .filter(Objects::nonNull)
                    .toList();
            } catch (Exception e) {
                return List.<String>of();
            }
        }).orElse(List.of());
    }

    private String slugify(String input) {
        if (input == null || input.isBlank()) return "";
        return java.text.Normalizer.normalize(input.toLowerCase(), java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{Diacritic}", "")
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
    }

    private String s(String v) {
        return v == null ? "" : v;
    }

    private static String getStringCell(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        
        CellType cellType = c.getCellType();
        if (cellType == CellType.BLANK) return null;
        if (cellType == CellType.STRING) {
            String s = c.getStringCellValue();
            return s != null ? s.trim() : null;
        }
        if (cellType == CellType.NUMERIC) {
            double d = c.getNumericCellValue();
            long l = (long) d;
            if (Math.abs(d - l) < 0.0000001) return String.valueOf(l);
            return String.valueOf(d);
        }
        if (cellType == CellType.BOOLEAN) {
            return String.valueOf(c.getBooleanCellValue());
        }
        if (cellType == CellType.FORMULA) {
            try {
                return String.valueOf(c.getNumericCellValue());
            } catch (Exception e) {
                return c.getStringCellValue();
            }
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

    private String buildSku10(String productTypeCode, String stt) {
        if (productTypeCode == null || productTypeCode.isBlank()) {
            throw new IllegalArgumentException("ProductTypeCode cannot be null or empty");
        }
        if (stt == null || stt.isBlank()) {
            throw new IllegalArgumentException("STT cannot be null or empty");
        }
        
        // Normalize productTypeCode to exactly 4 characters
        String normalizedCode = productTypeCode.trim().toUpperCase();
        if (normalizedCode.length() < 4) {
            // Pad with leading zeros if shorter than 4
            normalizedCode = String.format("%4s", normalizedCode).replace(' ', '0');
        } else if (normalizedCode.length() > 4) {
            // Truncate if longer than 4
            normalizedCode = normalizedCode.substring(0, 4);
        }
        
        // Pad STT to 6 digits with leading zeros
        String paddedStt = String.format("%6s", stt.replaceFirst("^0+", "")).replace(' ', '0');
        if (paddedStt.length() > 6) {
            paddedStt = paddedStt.substring(paddedStt.length() - 6);
        }
        
        return normalizedCode + paddedStt;
    }

    private Long resolveBranchIdByCode(String branchCode) {
        if (branchCode == null || branchCode.isBlank()) {
            throw new IllegalArgumentException("BranchCode cannot be null or empty");
        }
        
        return branchRepository.findByCode(branchCode)
            .map(Branch::getId)
            .orElseThrow(() -> new IllegalArgumentException("Branch not found with code: " + branchCode));
    }
}
