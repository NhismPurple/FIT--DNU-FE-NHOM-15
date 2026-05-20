# ArtGallery 🎨

Triển lãm nghệ thuật trực tuyến — Online Art Exhibition & Artwork Management Platform.

## 🏗️ Project Structure

```
artGallery/
├── index.html        ← Public page: display artworks
├── admin.html        ← Admin page: CRUD artworks
├── css/
│   └── style.css     ← Custom CSS on top of Bootstrap
├── js/
│   ├── api.js        ← All MockAPI fetch calls (GET/POST/PUT/DELETE)
│   ├── main.js       ← Logic for index.html (public gallery)
│   ├── admin.js      ← Logic for admin.html (admin panel)
│   └── utils.js      ← Utility functions: validate, formatPrice, etc.
├── img/              ← Static assets
└── README.md
```

## 🛠️ Technologies

- **HTML5** — Semantic markup
- **CSS3** — Custom styles with CSS variables
- **Bootstrap 5** — Layout, components, icons (CDN)
- **Vanilla JavaScript** — DOM manipulation, events, logic
- **jQuery** — Heart button pulse animation only
- **MockAPI.io** — REST API backend

## 🌐 API Endpoint

**Base URL:** `https://69fa35c8c509a40d3aa4125a.mockapi.io/api/v1/ArtGallery`

### Resources

| Method | Endpoint             | Description          |
|--------|---------------------|----------------------|
| GET    | /ArtGallery         | Get all artworks     |
| GET    | /ArtGallery/:id     | Get single artwork   |
| POST   | /ArtGallery         | Create new artwork   |
| PUT    | /ArtGallery/:id     | Update artwork       |
| DELETE | /ArtGallery/:id     | Delete artwork       |

## 📄 Pages

### index.html — Public Gallery
- Dark museum aesthetic with gold (#c9a84c) accents
- Masonry grid of artwork cards
- Filter by art style (Sơn dầu, Màu nước, Trừu tượng, Canvas, Hiện đại)
- ❤️ Like button with animated heart pulse
- Loading spinner & error handling

### admin.html — Admin Dashboard
- Sidebar navigation with statistics
- Full CRUD operations (Create, Read, Update, Delete)
- Inline form validation
- Approve/reject artwork toggle
- Real-time statistics updates

## 🚀 Getting Started

1. Open `index.html` in your browser to view the public gallery
2. Open `admin.html` to access the admin dashboard
3. No build step required — just static files + CDN

## 👤 Author

ArtGallery Project — Built with ❤️ for Vietnamese Art
