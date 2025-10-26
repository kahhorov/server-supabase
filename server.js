// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Iltimos .env ichiga SUPABASE_URL va SUPABASE_SERVICE_KEY ni qo'ying."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function handleErr(res, where, err) {
  console.error(where, err);
  res.status(500).json({ error: "Server xatosi", detail: err?.message || err });
}

// ------------------- USERS -------------------

// GET /users
app.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("order", { ascending: true });

    if (error) return handleErr(res, "GET /users supabase error", error);
    res.json(data);
  } catch (err) {
    handleErr(res, "GET /users catch", err);
  }
});

// POST /users
app.post("/users", async (req, res) => {
  try {
    const body = req.body || {};

    const { data: maxOrderRows, error: maxOrderErr } = await supabase
      .from("users")
      .select("order")
      .order("order", { ascending: false })
      .limit(1);

    if (maxOrderErr)
      return handleErr(res, "POST /users get max order", maxOrderErr);

    const lastOrder = (maxOrderRows && maxOrderRows[0]?.order) || 0;
    const newOrder = lastOrder + 1;

    const payload = {
      ...body,
      order: newOrder,
      checked: body.checked ?? false,
    };

    const { data, error } = await supabase
      .from("users")
      .insert(payload)
      .select()
      .single();

    if (error) return handleErr(res, "POST /users insert", error);

    res.status(201).json(data);
  } catch (err) {
    handleErr(res, "POST /users catch", err);
  }
});

// PUT /users/:id
app.put("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id) || req.params.id;
    const update = { ...req.body };
    delete update.id;

    const { data, error } = await supabase
      .from("users")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) return handleErr(res, "PUT /users update", error);

    res.json(data);
  } catch (err) {
    handleErr(res, "PUT /users catch", err);
  }
});

// PATCH /users/:id (checkbox toggle)
app.patch("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id) || req.params.id;
    const update = { ...req.body };
    delete update.id;

    const { data, error } = await supabase
      .from("users")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) return handleErr(res, "PATCH /users update", error);

    res.json(data);
  } catch (err) {
    handleErr(res, "PATCH /users catch", err);
  }
});

// DELETE /users/:id
app.delete("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id) || req.params.id;
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) return handleErr(res, "DELETE /users", error);

    // Qolganlar orderini qayta tartiblash
    const { data: all, error: allErr } = await supabase
      .from("users")
      .select("*")
      .order("order", { ascending: true });

    if (allErr) return handleErr(res, "DELETE /users re-fetch", allErr);

    for (let i = 0; i < all.length; i++) {
      if (all[i].order !== i + 1) {
        await supabase
          .from("users")
          .update({ order: i + 1 })
          .eq("id", all[i].id);
      }
    }

    res.json({ success: true });
  } catch (err) {
    handleErr(res, "DELETE /users catch", err);
  }
});

// ------------------- ATTENDANCE HISTORY -------------------

// GET /attendanceHistory
app.get("/attendanceHistory", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("attendanceHistory")
      .select("*")
      .order("id", { ascending: true });

    if (error) return handleErr(res, "GET /attendanceHistory", error);

    res.json(data);
  } catch (err) {
    handleErr(res, "GET /attendanceHistory catch", err);
  }
});

// POST /attendanceHistory
app.post("/attendanceHistory", async (req, res) => {
  try {
    const body = req.body || {};

    const { data: exists, error: existsErr } = await supabase
      .from("attendanceHistory")
      .select("id")
      .eq("date", body.date)
      .eq("group", body.group)
      .eq("day", body.day);

    if (existsErr)
      return handleErr(res, "POST /attendanceHistory exists check", existsErr);
    if (exists.length > 0)
      return res
        .status(400)
        .json({ error: "Bu guruhning bugungi davomati mavjud." });

    const { data, error } = await supabase
      .from("attendanceHistory")
      .insert(body)
      .select()
      .single();

    if (error) return handleErr(res, "POST /attendanceHistory insert", error);

    res.status(201).json(data);
  } catch (err) {
    handleErr(res, "POST /attendanceHistory catch", err);
  }
});

// PUT /attendanceHistory/:id
app.put("/attendanceHistory/:id", async (req, res) => {
  try {
    const id = Number(req.params.id) || req.params.id;
    const update = { ...req.body };
    delete update.id;

    const { data, error } = await supabase
      .from("attendanceHistory")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) return handleErr(res, "PUT /attendanceHistory update", error);

    res.json(data);
  } catch (err) {
    handleErr(res, "PUT /attendanceHistory catch", err);
  }
});

// DELETE /attendanceHistory/:id
app.delete("/attendanceHistory/:id", async (req, res) => {
  try {
    const id = Number(req.params.id) || req.params.id;

    const { error } = await supabase
      .from("attendanceHistory")
      .delete()
      .eq("id", id);
    if (error) return handleErr(res, "DELETE /attendanceHistory", error);

    res.json({ success: true });
  } catch (err) {
    handleErr(res, "DELETE /attendanceHistory catch", err);
  }
});

// Health check
app.get("/", (req, res) => res.send("Supabase server running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
