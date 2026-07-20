import express from "express";
import cors from "cors";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const campaignSources = [
  require("./config/affiliate-batches/buzzing-bees-wellness-pinterest.json"),
  require("./config/affiliate-batches/goblin-existing-stubbornly-pinterest.json"),
  require("./config/affiliate-batches/bad-enough-book-pinterest.json"),
  require("./config/affiliate