import { type Collection } from 'mongodb';
import { runMongoAction as runFind } from './find';
import { runMongoAction as runFindOne } from './findOne';
import { runMongoAction as runCountDocuments } from './countDocuments';
import { runMongoAction as runDistinct } from './distinct';
import { runMongoAction as runAggregate } from './aggregate';
import { runMongoAction as runInsertOne } from './insertOne';
import { runMongoAction as runInsertMany } from './insertMany';
import { runMongoAction as runReplaceOne } from './replaceOne';
import { runMongoAction as runFindOneAndUpdate } from './findOneAndUpdate';
import { runMongoAction as runUpdateOne } from './updateOne';
import { runMongoAction as runUpdateMany } from './updateMany';
import { runMongoAction as runDeleteOne } from './deleteOne';
import { runMongoAction as runDeleteMany } from './deleteMany';
import { runMongoAction as runFindOneAndDelete } from './findOneAndDelete';

import { type MongoActionContext } from '../handler.mongo';

type MongoActionHandler = (ctx: MongoActionContext, filter: Record<string, unknown>) => Promise<Record<string, unknown>>;

export const handlers: Record<string, MongoActionHandler> = {
  find: runFind,
  findOne: runFindOne,
  countDocuments: runCountDocuments,
  distinct: runDistinct,
  aggregate: runAggregate,
  insertOne: runInsertOne,
  insertMany: runInsertMany,
  replaceOne: runReplaceOne,
  findOneAndUpdate: runFindOneAndUpdate,
  updateOne: runUpdateOne,
  updateMany: runUpdateMany,
  deleteOne: runDeleteOne,
  deleteMany: runDeleteMany,
  findOneAndDelete: runFindOneAndDelete,
};
