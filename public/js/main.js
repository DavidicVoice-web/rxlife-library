const content = document.getElementById("content");

// Base API URL (same domain)
const API = "/api";

// Load default (books on page load)
window.onload = () => {
  loadSection("books");
};

// Load sections (books, videos, etc.)
async function loadSection(type) {
  content.innerHTML = "Loading...";

  try {
    const res = await fetch(`${API}/${type}`);
    const data = await res.json();

    displayData(data, type);
  } catch (err) {
    content.innerHTML = "Error loading data";
    console.error(err);
  }
}

// Display cards
function displayData(items, type) {
  if (!items || items.length === 0) {
    content.innerHTML = "No data found.";
    return;
  }

  content.innerHTML = items.map(item => `
    <div class="card">
      <h4>${item.title || item.term}</h4>
      <p>${item.description || item.definition || ""}</p>
      ${
        item.file_url 
        ? `<a href="${item.file_url}" target="_blank">Download</a>` 
        : ""
      }
    </div>
  `).join("");
}

// Search
document.getElementById("searchInput").addEventListener("keyup", async (e) => {
  const query = e.target.value;
  const filter = document.getElementById("filter").value;

  if (query.length < 2) return;

  content.innerHTML = "Searching...";

  try {
    const res = await fetch(`${API}/search?q=${query}&filter=${filter}`);
    const data = await res.json();

    displayData(data, "search");
  } catch (err) {
    content.innerHTML = "Search error";
    console.error(err);
  }
});