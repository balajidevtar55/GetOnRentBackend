const express = require('express');
const { body } = require('express-validator');
const teamController = require('../controllers/teamController');

const router = express.Router();

const createTeamValidation = [
  body('name').notEmpty().isLength({ min: 1, max: 100 }),
  body('description').optional().isLength({ max: 500 })
];

router.get('/', teamController.getTeams);
router.post('/', createTeamValidation, teamController.createTeam);
router.post('/:teamId/members', teamController.addMember);
router.delete('/:teamId/members/:memberId', teamController.removeMember);

module.exports = router;