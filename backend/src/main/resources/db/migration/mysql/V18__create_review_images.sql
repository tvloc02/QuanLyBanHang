CREATE TABLE IF NOT EXISTS review_images (
    review_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    CONSTRAINT fk_review_images_review
        FOREIGN KEY (review_id) REFERENCES reviews(id)
        ON DELETE CASCADE
);
