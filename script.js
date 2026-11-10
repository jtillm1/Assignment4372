/**
 * script.js
 * TVmaze Show Gallery (Assignment 4).
 *
 * Searches the TVmaze API for shows, then makes a second request per show
 * to load its main cast. All API text is inserted with createElement() and
 * textContent (never innerHTML).
 */

const SEARCH_URL = "https://api.tvmaze.com/search/shows?q=";
const CAST_URL_PREFIX = "https://api.tvmaze.com/shows/";
const MAX_RESULTS = 10;
const MAX_CAST = 5;
const MAX_SUMMARY_LENGTH = 220;
const NOT_AVAILABLE = "Not available";

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const statusMessage = document.getElementById("status");
const gallery = document.getElementById("gallery");

/**
 * Fetches a URL and returns the parsed JSON body.
 * Checks the response status before calling json().
 * @param {string} url - The URL to request.
 * @returns {Promise<any>} The parsed JSON data.
 * @throws {Error} With a user-friendly message for network, 429, or HTTP errors.
 */
async function fetchJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error("Network error. Check your connection and try again.");
  }

  if (response.status === 429) {
    throw new Error("TVmaze is limiting requests right now. Wait a few seconds and search again.");
  }
  if (!response.ok) {
    throw new Error("TVmaze returned an error (HTTP " + response.status + "). Try again later.");
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error("TVmaze sent a response that could not be read.");
  }
}

/**
 * Converts an HTML string from the API into plain text.
 * @param {string|null} html - HTML such as "<p>Some <b>text</b></p>".
 * @returns {string} Plain text with no markup.
 */
function stripHtml(html) {
  if (!html) {
    return "";
  }
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return (parsed.body.textContent || "").trim();
}

/**
 * Shortens text to a maximum length, ending at a word boundary.
 * @param {string} text - The text to shorten.
 * @param {number} maxLength - The maximum number of characters.
 * @returns {string} The original or shortened text.
 */
function truncate(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  const cut = text.slice(0, maxLength);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

/**
 * Formats a "YYYY-MM-DD" premiere date for display.
 * @param {string|null} dateString - The premiere date from the API.
 * @returns {string} A readable date, or "Not available".
 */
function formatPremiere(dateString) {
  if (!dateString) {
    return NOT_AVAILABLE;
  }
  const parts = dateString.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(date.getTime())) {
    return NOT_AVAILABLE;
  }
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Formats the show's "updated" Unix timestamp (in seconds) as a date and time.
 * @param {number|null} timestamp - Seconds since January 1, 1970.
 * @returns {string} A readable date and time, or "Not available".
 */
function formatUpdated(timestamp) {
  if (typeof timestamp !== "number") {
    return NOT_AVAILABLE;
  }
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

/**
 * Creates an element with optional text and class name.
 * @param {string} tag - The tag name.
 * @param {string} [text] - Text content to set.
 * @param {string} [className] - A class name to add.
 * @returns {HTMLElement} The new element.
 */
function createEl(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) {
    element.textContent = text;
  }
  if (className) {
    element.className = className;
  }
  return element;
}

/**
 * Adds a label/value pair to a description list.
 * @param {HTMLElement} list - The <dl> element.
 * @param {string} label - The term, such as "Premiered".
 * @param {string} value - The value to display.
 * @returns {HTMLElement} The <dd> element, so callers can update it later.
 */
function addDetail(list, label, value) {
  const row = createEl("div");
  const term = createEl("dt", label + ":");
  const description = createEl("dd", value);
  row.append(term, description);
  list.append(row);
  return description;
}

/**
 * Builds the poster image, or a text fallback when there is no image.
 * @param {Object} show - A TVmaze show object.
 * @returns {HTMLElement} An <img> or a fallback <div>.
 */
function createPoster(show) {
  const fallback = createEl("div", "No poster available", "poster-fallback");
  const imageUrl = show.image && (show.image.medium || show.image.original);
  if (!imageUrl) {
    return fallback;
  }

  const image = createEl("img", undefined, "poster");
  image.src = imageUrl.replace("http://", "https://");
  image.alt = "Poster for " + show.name;
  image.loading = "lazy";
  image.addEventListener("error", () => image.replaceWith(fallback));
  return image;
}

/**
 * Builds one show card. The cast line starts as "Loading cast…".
 * @param {Object} show - A TVmaze show object.
 * @returns {{card: HTMLElement, castElement: HTMLElement}} The card and its cast element.
 */
function createCard(show) {
  const card = createEl("article", undefined, "card");
  const body = createEl("div", undefined, "card-body");

  const summaryText = stripHtml(show.summary);
  const summary = createEl(
    "p",
    summaryText ? truncate(summaryText, MAX_SUMMARY_LENGTH) : "Summary not available.",
    "summary"
  );

  const details = createEl("dl", undefined, "details");
  addDetail(details, "Premiered", formatPremiere(show.premiered));
  addDetail(details, "Last updated", formatUpdated(show.updated));
  addDetail(
    details,
    "Genres",
    show.genres && show.genres.length > 0 ? show.genres.join(", ") : NOT_AVAILABLE
  );
  const rating = show.rating && typeof show.rating.average === "number"
    ? show.rating.average.toFixed(1) + " / 10"
    : NOT_AVAILABLE;
  addDetail(details, "Average rating", rating);
  const castElement = addDetail(details, "Main cast", "Loading cast…");
  castElement.classList.add("cast-note");

  const link = createEl("a", "View " + show.name + " on TVmaze", "card-link");
  link.href = show.url || "https://www.tvmaze.com/";
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  body.append(createEl("h2", show.name || "Untitled show", "card-title"), summary, details, link);
  card.append(createPoster(show), body);
  return { card, castElement };
}

/**
 * Makes the second request for a show's cast and writes it into the card.
 * @param {number} showId - The TVmaze show ID.
 * @param {HTMLElement} castElement - The element to update.
 * @returns {Promise<void>}
 */
async function loadCast(showId, castElement) {
  try {
    const cast = await fetchJson(CAST_URL_PREFIX + showId + "/cast");
    const names = [];
    cast.forEach((entry) => {
      const name = entry.person && entry.person.name;
      if (name && !names.includes(name) && names.length < MAX_CAST) {
        names.push(name);
      }
    });

    if (names.length > 0) {
      castElement.textContent = names.join(", ");
      castElement.classList.remove("cast-note");
    } else {
      castElement.textContent = NOT_AVAILABLE;
    }
  } catch (error) {
    castElement.textContent = "Cast could not be loaded.";
  }
}

/**
 * Shows a message above the gallery.
 * @param {string} message - The text to display.
 * @param {boolean} [isError=false] - Whether to style it as an error.
 */
function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

/**
 * Searches TVmaze and replaces the gallery with the results.
 * Handles empty input, no matches, and request errors.
 * @param {string} query - The visitor's search text.
 * @returns {Promise<void>}
 */
async function searchShows(query) {
  const trimmed = query.trim();
  gallery.replaceChildren();

  if (!trimmed) {
    setStatus("Enter a show title or keyword to search.", true);
    return;
  }

  searchButton.disabled = true;
  setStatus("Searching for “" + trimmed + "”…");

  try {
    const results = await fetchJson(SEARCH_URL + encodeURIComponent(trimmed));
    const shows = results.slice(0, MAX_RESULTS).map((result) => result.show);

    if (shows.length === 0) {
      setStatus("No shows found for “" + trimmed + "”. Try a different title or keyword.");
      return;
    }

    setStatus("Showing " + shows.length + " result" + (shows.length === 1 ? "" : "s") +
      " for “" + trimmed + "”.");

    shows.forEach((show) => {
      const { card, castElement } = createCard(show);
      gallery.append(card);
      loadCast(show.id, castElement);
    });
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    searchButton.disabled = false;
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchShows(searchInput.value);
});

// Load the default search when the page first opens.
searchInput.value = DEFAULT_QUERY;
searchShows(DEFAULT_QUERY);