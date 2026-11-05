import { Router } from 'express';
import {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  startVotingNow,
  closeVotingEarly,
  registerEventMembers,
  getEventMembers,
  addCategory,
} from './events.service.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { validate } from '../../middleware/validate.js';
import {
  createEventSchema,
  updateEventSchema,
  eventIdParamSchema,
  registerEventMembersSchema,
  addCategorySchema,
} from './events.schema.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();

// Protect event management routes
router.use(requireAdminAuth);

router.get('/', async (req, res, next) => {
  try {
    const events = await listEvents();
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createEventSchema), async (req, res, next) => {
  try {
    const { title, description, durationMinutes, startAt, endAt, categories } = req.body;
    const event = await createEvent({
      title,
      description,
      durationMinutes,
      startAt,
      endAt,
      categories,
      adminId: req.admin.id,
    });
    res.status(201).json({ message: 'Event created successfully', event });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start', validate(eventIdParamSchema), async (req, res, next) => {
  try {
    const { durationMinutes } = req.body;
    const event = await startVotingNow(req.params.id, durationMinutes);
    res.json({ message: 'Voting started successfully', event });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validate(eventIdParamSchema), async (req, res, next) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', validate(updateEventSchema), async (req, res, next) => {
  try {
    const event = await updateEvent(req.params.id, req.body);
    res.json({ message: 'Event updated successfully', event });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/close', validate(eventIdParamSchema), async (req, res, next) => {
  try {
    const event = await closeVotingEarly(req.params.id);
    res.json({ message: 'Voting closed early successfully', event });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/members', validate(eventIdParamSchema), async (req, res, next) => {
  try {
    const members = await getEventMembers(req.params.id);
    res.json({ members });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/members', validate(registerEventMembersSchema), async (req, res, next) => {
  try {
    const { memberIds, isEligible } = req.body;
    const result = await registerEventMembers(req.params.id, memberIds, isEligible);
    res.status(200).json({ message: 'Event members updated successfully', ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/categories', validate(addCategorySchema), async (req, res, next) => {
  try {
    const { name } = req.body;
    const category = await addCategory(req.params.id, name);
    res.status(201).json({ message: 'Category added successfully', category });
  } catch (err) {
    next(err);
  }
});

export default router;

