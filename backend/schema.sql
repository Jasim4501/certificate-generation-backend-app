CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name VARCHAR(255) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    organization_name VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    certificate_id_display VARCHAR(100) NOT NULL,
    instructor_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
