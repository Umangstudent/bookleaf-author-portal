const express = require("express");
const { getDb } = require("../config/database");
const { authenticate } = require("../middleware/auth");
const router = express.Router();

// GET /api/books/my
router.get("/my", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "author")
      return res
        .status(403)
        .json({ error: "Author access required.", code: "FORBIDDEN" });
    const db = getDb();
    const books = await db("books")
      .where({ author_id: req.user.authorId })
      .orderBy([
        { column: "publication_date", order: "desc", nulls: "last" },
        { column: "book_id", order: "asc" },
      ]);
    res.json({
      books: books.map((b) => ({
        ...b,
        available_on: b.available_on ? JSON.parse(b.available_on) : [],
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/books/:bookId
router.get("/:bookId", authenticate, async (req, res) => {
  try {
    const db = getDb();
    const book = await db("books")
      .where({ book_id: req.params.bookId })
      .first();
    if (!book)
      return res
        .status(404)
        .json({ error: "Book not found.", code: "NOT_FOUND" });
    if (req.user.role === "author" && book.author_id !== req.user.authorId) {
      return res
        .status(403)
        .json({ error: "Access denied.", code: "FORBIDDEN" });
    }
    res.json({
      book: {
        ...book,
        available_on: book.available_on ? JSON.parse(book.available_on) : [],
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
