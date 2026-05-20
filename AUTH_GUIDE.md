# 🔐 Hệ Thống Đăng Ký & Đăng Nhập - ArtGallery

## Tổng Quan

Hệ thống authentication hoàn chỉnh cho ArtGallery với 2 loại người dùng:
- **Người dùng bình thường**: Xem gallery, thích tác phẩm
- **Quản trị viên (Admin)**: Quản lý tác phẩm, duyệt tác phẩm

---

## 📱 Trang Đăng Nhập

### Cho Người Dùng
**File:** `login.html`

**Chức năng:**
- ✅ Đăng ký tài khoản mới
- ✅ Đăng nhập tài khoản
- ✅ Toggle giữa form đăng ký/đăng nhập
- ✅ Show/hide password
- ✅ Validation form
- ✅ Chuyển hướng sang trang admin-login

**URL:** 
- Đăng nhập: `http://localhost/ArtGallery/login.html`
- Form: Toggle bằng nút "Tạo tài khoản mới"

### Cho Quản Trị Viên
**File:** `admin-login.html`

**Chức năng:**
- ✅ Đăng nhập admin
- ✅ Tài khoản demo hiển thị
- ✅ Show/hide password
- ✅ Liên kết đến login.html cho người dùng

**URL:** 
- Đăng nhập admin: `http://localhost/ArtGallery/admin-login.html`

**Tài khoản Demo Admin:**
```
👤 Tên đăng nhập: admin
🔐 Mật khẩu: admin123
```

---

## 🔑 Thông Tin Đăng Nhập

### Tài Khoản Admin
```
Username: admin
Password: admin123
```

### Người Dùng Demo
```
Email: demo@example.com
Password: demo123456
Tên: Demo User
```

Hoặc bạn có thể tạo tài khoản mới bất kỳ lúc nào!

---

## 🏗️ Cấu Trúc Hệ Thống

### Files Chính

```
ArtGallery/
├── login.html              # Trang đăng nhập/đăng ký người dùng
├── admin-login.html        # Trang đăng nhập admin
└── js/
    └── auth.js            # Core authentication logic
```

### Tích Hợp Trong Files Hiện Có

- **index.html**: Thêm dropdown menu người dùng, logout button
- **admin.html**: Kiểm tra authentication, logout button
- **main.js**: Sẽ hiển thị liên kết phù hợp dựa trên user status

---

## 🔐 Tính Năng Authentication

### AuthManager Class

```javascript
// Khởi tạo
const auth = new AuthManager();

// Đăng ký người dùng
auth.registerUser(email, password, fullName);

// Đăng nhập người dùng
auth.loginUser(email, password);

// Đăng nhập admin
auth.loginAdmin(username, password);

// Kiểm tra đăng nhập
auth.isUserLoggedIn()  // boolean
auth.isAdminLoggedIn() // boolean

// Lấy thông tin hiện tại
auth.getCurrentUser()  // user object
auth.getCurrentAdmin() // admin object

// Đăng xuất
auth.logoutUser()
auth.logoutAdmin()
```

---

## 💾 Storage

### LocalStorage Keys

```javascript
// Người dùng
localStorage.getItem('artgallery_users')              // Danh sách tất cả người dùng
localStorage.getItem('artgallery_current_user')       // User session hiện tại

// Admin
localStorage.getItem('artgallery_admin_creds')        // Thông tin đăng nhập admin
localStorage.getItem('artgallery_admin_session')      // Admin session hiện tại
```

**Lưu ý:** Hệ thống hiện sử dụng localStorage (demo). Trong production, sử dụng backend + server-side sessions.

---

## 🎯 Workflow

### Người Dùng Bình Thường

```
1. Truy cập trang chủ (index.html)
2. Thấy nút "Đăng nhập" → Click → login.html
3. Chọn "Đăng ký" hoặc "Đăng nhập"
4. Điền thông tin + Submit
5. Nếu thành công → Redirect về index.html
6. Navbar hiển thị: [Tên User] ▼ | Logout
7. Click logout → Xóa session → Quay lại index.html
```

### Quản Trị Viên

```
1. Truy cập admin-login.html (hoặc qua link trong login.html)
2. Nhập username: admin
3. Nhập password: admin123
4. Click "Đăng Nhập Admin"
5. Redirect → admin.html
6. Header hiển thị: [Xem Gallery] [Đăng xuất]
7. Click logout → Quay lại admin-login.html
```

---

## 🔒 Bảo Mật

### Hiện Tại (Demo)
- ✅ Simple password hashing
- ✅ Email validation
- ✅ LocalStorage encryption minimal
- ✅ Session-based authentication

### Cần Cải Thiện (Production)
- [ ] Use bcrypt for password hashing
- [ ] Implement server-side sessions
- [ ] HTTPS/TLS encryption
- [ ] Rate limiting on login
- [ ] JWT tokens
- [ ] CSRF protection
- [ ] Input sanitization

---

## 📋 Validation Rules

### Đăng Ký
- ✅ Email phải hợp lệ (format)
- ✅ Tên không được để trống
- ✅ Mật khẩu ≥ 6 ký tự
- ✅ Email không được trùng
- ✅ Mật khẩu xác nhận phải trùng khớp

### Đăng Nhập
- ✅ Tất cả trường bắt buộc
- ✅ Email/password phải chính xác
- ✅ Admin username/password phải chính xác

---

## 🧪 Test Cases

### Đăng Ký Thành Công
```
1. Truy cập login.html
2. Click "Tạo tài khoản mới"
3. Điền:
   - Họ tên: John Doe
   - Email: john@example.com
   - Mật khẩu: password123
   - Xác nhận: password123
4. Click "Đăng Ký"
5. Kết quả: ✅ Chuyển về form login, có thể đăng nhập
```

### Đăng Nhập Thất Bại
```
1. login.html
2. Điền email/password sai
3. Click "Đăng Nhập"
4. Kết quả: ❌ Hiện thông báo lỗi
```

### Admin Login
```
1. Truy cập admin-login.html
2. Điền:
   - Username: admin
   - Password: admin123
3. Click "Đăng Nhập Admin"
4. Kết quả: ✅ Redirect → admin.html
```

---

## 🔗 Quick Links

| Chức Năng | URL |
|-----------|-----|
| Trang chủ | `index.html` |
| Đăng nhập người dùng | `login.html` |
| Đăng nhập admin | `admin-login.html` |
| Admin panel | `admin.html` (cần auth) |

---

## 📝 Notes

- Session lưu trong localStorage - mất khi xóa browser cache
- Mật khẩu được hash (simple - dùng bcrypt trong production)
- Tài khoản admin được khởi tạo tự động lần đầu
- Người dùng có thể tạo nhiều tài khoản

---

**Cập nhật:** May 20, 2026
**Status:** ✅ Fully Functional
