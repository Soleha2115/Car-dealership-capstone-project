const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = Number(process.env.PORT || 3000);
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dealership';

app.use(express.json({ limit: '32kb' }));

const dealerSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  full_name: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  address: { type: String, required: true },
  zip: { type: String, required: true },
  image: { type: String, default: '' },
}, { versionKey: false });

const reviewSchema = new mongoose.Schema({
  dealerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  username: { type: String, required: true },
  review: { type: String, required: true, maxlength: 2000 },
  purchase: { type: Boolean, default: false },
  purchaseDate: { type: String, default: '' },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

const Dealer = mongoose.model('Dealer', dealerSchema);
const Review = mongoose.model('Review', reviewSchema);

const sampleDealers = [
  { id: '1', full_name: 'Kansas City Motor Company', city: 'Kansas City', state: 'Kansas', address: '1200 Main Street', zip: '66101', image: 'https://images.unsplash.com/photo-1562519819-016930ada31b?auto=format&fit=crop&w=1200&q=85' },
  { id: '2', full_name: 'Prairie Star Automotive', city: 'Wichita', state: 'Kansas', address: '8400 East Central Avenue', zip: '67206', image: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=85' },
  { id: '3', full_name: 'Lakeside Auto Gallery', city: 'Chicago', state: 'Illinois', address: '415 North State Street', zip: '60654', image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85' },
  { id: '4', full_name: 'Motor City Select', city: 'Detroit', state: 'Michigan', address: '250 Jefferson Avenue', zip: '48226', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85' },
];

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/fetchDealers', async (_req, res, next) => {
  try {
    res.json(await Dealer.find().sort({ id: 1 }).lean());
  } catch (error) {
    next(error);
  }
});

app.get('/fetchDealers/:state', async (req, res, next) => {
  try {
    res.json(await Dealer.find({ state: new RegExp(`^${req.params.state}$`, 'i') }).sort({ id: 1 }).lean());
  } catch (error) {
    next(error);
  }
});

app.get('/fetchDealer/:id', async (req, res, next) => {
  try {
    const dealer = await Dealer.findOne({ id: req.params.id }).lean();
    if (!dealer) return res.status(404).json({ error: 'Dealer not found.' });
    return res.json(dealer);
  } catch (error) {
    return next(error);
  }
});

app.get('/fetchReviews/dealer/:id', async (req, res, next) => {
  try {
    res.json(await Review.find({ dealerId: req.params.id }).sort({ createdAt: -1 }).lean());
  } catch (error) {
    next(error);
  }
});

app.post('/addReview', async (req, res, next) => {
  try {
    const { dealerId, name, username, review, purchase, purchaseDate, rating } = req.body;
    if (!dealerId || !name || !username || !review || !String(review).trim()) {
      return res.status(400).json({ error: 'Dealer, name, username, and review are required.' });
    }
    if (!(await Dealer.exists({ id: String(dealerId) }))) {
      return res.status(404).json({ error: 'Dealer not found.' });
    }
    const saved = await Review.create({
      dealerId: String(dealerId),
      name: String(name).trim(),
      username: String(username).trim(),
      review: String(review).trim(),
      purchase: Boolean(purchase),
      purchaseDate: String(purchaseDate || ''),
      rating: Number(rating) || 5,
    });
    return res.status(201).json(saved);
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(500).json({ error: 'The dealer service could not complete the request.' });
});

mongoose.connect(mongoUri)
  .then(async () => {
    if (await Dealer.countDocuments() === 0) await Dealer.insertMany(sampleDealers);
    app.listen(port, '0.0.0.0', () => console.log(`Dealer service listening on ${port}`));
  })
  .catch((error) => {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  });