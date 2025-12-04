const Assignment = require('../model/assignment');
const Submission = require('../model/submission');

// Get all assignments
async function getAssignments(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortOrder = req.query.sort === 'desc' ? -1 : 1;
    const search = req.query.search || '';
    const hideCompleted = req.query.hideCompleted === 'true';
    const skip = (page - 1) * limit;

    try {
        // 1. Build the aggregation pipeline
        const pipeline = [];

        // Search filter (optimization: filter by name early)
        if (search) {
            pipeline.push({
                $match: {
                    nom: { $regex: search, $options: 'i' }
                }
            });
        }

        // Lookup submissions to determine 'rendu' status
        pipeline.push(
            {
                $lookup: {
                    from: 'submissions',
                    localField: '_id',
                    foreignField: 'assignmentId',
                    as: 'submission'
                }
            },
            {
                $addFields: {
                    rendu: { $gt: [{ $size: "$submission" }, 0] },
                    id: "$_id"
                }
            },
            {
                $project: {
                    submission: 0
                }
            }
        );

        // Filter by computed 'rendu' field if needed
        if (hideCompleted) {
            pipeline.push({
                $match: {
                    rendu: false
                }
            });
        }

        // Sort
        pipeline.push({
            $sort: {
                dateDeRendu: sortOrder
            }
        });

        // 2. Use $facet to get data and count in parallel
        const facetPipeline = [
            ...pipeline,
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }]
                }
            }
        ];

        const result = await Assignment.aggregate(facetPipeline);
        
        const data = result[0].data;
        const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
        const totalPages = Math.ceil(total / limit);
        const hasPrevPage = page > 1;
        const hasNextPage = page < totalPages;

        res.json({
            docs: data,
            totalDocs: total,
            limit: limit,
            page: page,
            totalPages: totalPages,
            hasPrevPage: hasPrevPage,
            hasNextPage: hasNextPage,
            prevPage: hasPrevPage ? page - 1 : null,
            nextPage: hasNextPage ? page + 1 : null
        });
    } catch (err) {
        res.status(500).send(err);
    }
}

// Get one assignment by _id
async function getAssignment(req, res) {
    let assignmentId = req.params.id;

    try {
        // We can use aggregate for single item too, or find + count
        const assignment = await Assignment.findById(assignmentId).lean();
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        const submission = await Submission.findOne({ assignmentId: assignment._id });
        assignment.rendu = !!submission;

        res.json(assignment);
    } catch (err) {
        res.status(500).send(err);
    }
}

// Post assignment
async function postAssignment(req, res) {
    let assignment = new Assignment();
    assignment.nom = req.body.nom;
    assignment.dateDeRendu = req.body.dateDeRendu;
    // assignment.rendu = req.body.rendu; // No longer in schema
    assignment.description = req.body.description;
    assignment.userId = req.body.userId;

    console.log("POST assignment received:");
    console.log(assignment);

    try {
        const savedAssignment = await assignment.save();
        
        // Handle initial rendu state
        if (req.body.rendu && req.body.userId) {
             await Submission.create({
                 assignmentId: savedAssignment._id,
                 userId: req.body.userId
             });
        }

        // Return object with computed rendu for consistency
        const result = savedAssignment.toObject();
        result.rendu = !!req.body.rendu;

        res.json({ message: `${assignment.nom} saved!`, assignment: result });
    } catch (err) {
        res.status(500).send('cant post assignment ' + err);
    }
}

// Update assignment
async function updateAssignment(req, res) {
    console.log("UPDATE received assignment:");
    console.log(req.body);
    
    try {
        const assignmentId = req.body._id;
        const userId = req.body.userId;
        const isRendu = req.body.rendu;

        // 1. Update the assignment fields (excluding rendu)
        // We use {new: true} to get the updated document
        const updatedAssignment = await Assignment.findByIdAndUpdate(
            assignmentId, 
            {
                nom: req.body.nom,
                dateDeRendu: req.body.dateDeRendu,
                description: req.body.description,
                userId: req.body.userId
            }, 
            { new: true }
        ).lean();

        if (!updatedAssignment) {
             return res.status(404).json({ message: 'Assignment not found' });
        }

        // 2. Handle Rendu state (Submission table)
        if (isRendu) {
            // Ensure submission exists
            // We need userId. If not in body, we rely on existing assignment's userId (which we have in updatedAssignment)
            const targetUserId = userId || updatedAssignment.userId;
            if (targetUserId) {
                await Submission.updateOne(
                    { assignmentId: assignmentId },
                    { 
                        $set: { assignmentId: assignmentId, userId: targetUserId } 
                    },
                    { upsert: true }
                );
            }
        } else {
            // Remove submission if it exists
            await Submission.deleteOne({ assignmentId: assignmentId });
        }

        // 3. Prepare response
        updatedAssignment.rendu = isRendu;

        res.json({ message: 'updated', assignment: updatedAssignment });
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
}

// Delete assignment
async function deleteAssignment(req, res) {
    try {
        const assignment = await Assignment.findByIdAndDelete(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        
        // Also delete related submission
        await Submission.deleteMany({ assignmentId: req.params.id });

        res.json({ message: `${assignment.nom} deleted` });
    } catch (err) {
        res.status(500).send(err);
    }
}

module.exports = { getAssignments, postAssignment, getAssignment, updateAssignment, deleteAssignment };
