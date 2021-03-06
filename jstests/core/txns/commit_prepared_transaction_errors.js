/**
 * Test error cases for committing prepared transactions.
 *
 * @tags: [uses_transactions]
 */
(function() {
    "use strict";
    load("jstests/core/txns/libs/prepare_helpers.js");

    const dbName = "test";
    const collName = "commit_prepared_transaction_errors";
    const testDB = db.getSiblingDB(dbName);
    const testColl = testDB.getCollection(collName);

    testColl.drop({writeConcern: {w: "majority"}});
    assert.commandWorked(testDB.runCommand({create: collName, writeConcern: {w: "majority"}}));

    const session = db.getMongo().startSession({causalConsistency: false});
    const sessionDB = session.getDatabase(dbName);
    const sessionColl = sessionDB.getCollection(collName);

    const doc = {_id: 1};

    jsTestLog("Test committing a prepared transaction with no 'commitTimestamp'.");
    session.startTransaction();
    assert.commandWorked(sessionColl.insert(doc));
    PrepareHelpers.prepareTransaction(session);
    assert.commandFailedWithCode(sessionDB.adminCommand({commitTransaction: 1}),
                                 ErrorCodes.InvalidOptions);
    // Make sure the transaction is still running by observing write conflicts.
    const anotherSession = db.getMongo().startSession({causalConsistency: false});
    anotherSession.startTransaction();
    assert.commandFailedWithCode(
        anotherSession.getDatabase(dbName).getCollection(collName).insert(doc),
        ErrorCodes.WriteConflict);
    anotherSession.abortTransaction();
    // Abort the original transaction.
    session.abortTransaction();

    jsTestLog("Test committing a prepared transaction with an invalid 'commitTimestamp'.");
    session.startTransaction();
    assert.commandWorked(sessionColl.insert(doc));
    PrepareHelpers.prepareTransaction(session);
    assert.commandFailedWithCode(PrepareHelpers.commitTransaction(session, 5),
                                 ErrorCodes.TypeMismatch);

    jsTestLog("Test committing a prepared transaction with a null 'commitTimestamp'.");
    session.startTransaction();
    assert.commandWorked(sessionColl.insert(doc));
    PrepareHelpers.prepareTransaction(session);
    assert.commandFailedWithCode(PrepareHelpers.commitTransaction(session, Timestamp(0, 0)),
                                 ErrorCodes.InvalidOptions);

    jsTestLog("Test committing an unprepared transaction with a 'commitTimestamp'.");
    session.startTransaction();
    assert.commandWorked(sessionColl.insert(doc));
    assert.commandFailedWithCode(PrepareHelpers.commitTransaction(session, Timestamp(3, 3)),
                                 ErrorCodes.InvalidOptions);

    jsTestLog("Test committing an unprepared transaction with a null 'commitTimestamp'.");
    session.startTransaction();
    assert.commandWorked(sessionColl.insert(doc));
    assert.commandFailedWithCode(PrepareHelpers.commitTransaction(session, Timestamp(0, 0)),
                                 ErrorCodes.InvalidOptions);

    jsTestLog("Test committing an unprepared transaction with an invalid 'commitTimestamp'.");
    session.startTransaction();
    assert.commandWorked(sessionColl.insert(doc));
    assert.commandFailedWithCode(PrepareHelpers.commitTransaction(session, 5),
                                 ErrorCodes.TypeMismatch);
}());
