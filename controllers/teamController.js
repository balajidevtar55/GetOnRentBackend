const Team = require('../models/Team');
const { validationResult } = require('express-validator');

class TeamController {
  // Get user teams
  async getTeams(req, res) {
    try {
      const userId = req.user.id;
      
      const teams = await Team.find({
        members: userId
      }).populate('members', 'name avatar status');

      res.json({ success: true, data: teams });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Create team
  async createTeam(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, description, members = [] } = req.body;
      const userId = req.user.id;

      const team = new Team({
        name,
        description,
        members: [userId, ...members],
        createdBy: userId
      });

      await team.save();
      await team.populate('members', 'name avatar status');

      res.status(201).json({ success: true, data: team });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Add team member
  async addMember(req, res) {
    try {
      const { teamId } = req.params;
      const { memberId } = req.body;
      const userId = req.user.id;

      const team = await Team.findOne({
        _id: teamId,
        members: userId
      });

      if (!team) {
        return res.status(404).json({ success: false, message: 'Team not found' });
      }

      if (!team.members.includes(memberId)) {
        team.members.push(memberId);
        await team.save();
      }

      await team.populate('members', 'name avatar status');
      res.json({ success: true, data: team });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Remove team member
  async removeMember(req, res) {
    try {
      const { teamId, memberId } = req.params;
      const userId = req.user.id;

      const team = await Team.findOne({
        _id: teamId,
        members: userId
      });

      if (!team) {
        return res.status(404).json({ success: false, message: 'Team not found' });
      }

      team.members = team.members.filter(member => member.toString() !== memberId);
      await team.save();

      await team.populate('members', 'name avatar status');
      res.json({ success: true, data: team });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new TeamController();