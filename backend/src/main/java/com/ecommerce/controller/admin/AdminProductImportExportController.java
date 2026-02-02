package com.ecommerce.controller.admin;

import com.ecommerce.dto.request.AdminProductImportMode;
import com.ecommerce.dto.response.AdminProductImportResult;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.service.product.AdminProductImportExportService;
import java.util.ArrayList;
import java.util.List;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductImportExportController {

    private final AdminProductImportExportService importExportService;

    public AdminProductImportExportController(AdminProductImportExportService importExportService) {
        this.importExportService = importExportService;
    }

    @GetMapping("/export")
    public ResponseEntity<Resource> exportZip(@RequestParam(name = "ids", required = false) List<Long> ids) {
        var exp = importExportService.exportProductsZip(ids);
        byte[] raw = exp.bytes();
        byte[] bytes = raw != null ? raw : new byte[0];
        String rawName = exp.filename();
        String filename = rawName != null ? rawName : "products.zip";
        ByteArrayResource res = new ByteArrayResource(bytes);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_OCTET_STREAM_VALUE)
            .contentLength(bytes.length)
            .body(res);
    }

    @GetMapping("/template")
    public ResponseEntity<Resource> templateZip() {
        var exp = importExportService.exportTemplateZip();
        byte[] raw = exp.bytes();
        byte[] bytes = raw != null ? raw : new byte[0];
        String rawName = exp.filename();
        String filename = rawName != null ? rawName : "products_template.zip";
        ByteArrayResource res = new ByteArrayResource(bytes);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_OCTET_STREAM_VALUE)
            .contentLength(bytes.length)
            .body(res);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AdminProductImportResult>> importZip(
        @RequestParam("file") MultipartFile file,
        @RequestParam(name = "mode", required = false, defaultValue = "CREATE") String mode,
        @RequestParam(name = "categoryIds", required = false) List<Long> categoryIds
    ) {
        AdminProductImportMode m;
        try {
            m = AdminProductImportMode.valueOf(mode.trim().toUpperCase());
        } catch (Exception e) {
            m = AdminProductImportMode.CREATE;
        }

        List<Long> cats = categoryIds != null ? categoryIds : new ArrayList<>();
        AdminProductImportResult result = importExportService.importProductsZipOrXlsx(file, m, cats);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
