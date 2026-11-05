import { Router } from 'express';
import {
  listMembers,
  getMemberById,
  createMember,
  updateMember,
  deactivateMember,
  importMembersFromCsv,
  importMembersFromList,
  getNextMemberCode,
  deleteMember,
} from './members.service.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { validate } from '../../middleware/validate.js';
import {
  createMemberSchema,
  updateMemberSchema,
  memberIdParamSchema,
  csvImportSchema,
} from './members.schema.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();

// Protect all admin member management routes
router.use(requireAdminAuth);

router.get('/', async (req, res, next) => {
  try {
    const { search, isActive, limit, offset } = req.query;
    const data = await listMembers({ search, isActive, limit, offset });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/next-code', async (req, res, next) => {
  try {
    const nextCode = await getNextMemberCode();
    res.json({ nextCode });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createMemberSchema), async (req, res, next) => {
  try {
    const { memberCode, fullName, isActive } = req.body;
    const member = await createMember({ memberCode, fullName, isActive });
    res.status(201).json({ message: 'Member created successfully', member });
  } catch (err) {
    next(err);
  }
});

router.post('/import-csv', validate(csvImportSchema), async (req, res, next) => {
  try {
    const { csvContent, members } = req.body;
    let result;
    if (members && Array.isArray(members)) {
      result = await importMembersFromList(members);
    } else if (csvContent) {
      result = await importMembersFromCsv(csvContent);
    } else {
      throw new AppError('Either members array or csvContent is required', 400, 'PAYLOAD_REQUIRED');
    }

    res.status(200).json({
      message: `Imported ${result.importedCount} members successfully`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validate(memberIdParamSchema), async (req, res, next) => {
  try {
    const member = await getMemberById(req.params.id);
    if (!member) {
      throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
    }
    res.json({ member });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', validate(updateMemberSchema), async (req, res, next) => {
  try {
    const member = await updateMember(req.params.id, req.body);
    res.json({ message: 'Member updated successfully', member });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/deactivate', validate(memberIdParamSchema), async (req, res, next) => {
  try {
    const member = await deactivateMember(req.params.id);
    res.json({ message: 'Member deactivated successfully', member });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', validate(memberIdParamSchema), async (req, res, next) => {
  try {
    const member = await deleteMember(req.params.id);
    res.json({ message: 'Member deleted successfully', member });
  } catch (err) {
    next(err);
  }
});

export default router;

