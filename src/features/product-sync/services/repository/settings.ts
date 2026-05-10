);

const readSettingValue = async (key: string): Promise<string | null> => {
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoTimestampedStringSettingDocument<string | ObjectId>>('settings')
    .findOne({
      $or: [{ _id: toMongoId(key) }, { key }],
    } as Filter<MongoTimestampedStringSettingDocument<string | ObjectId>>);
  return typeof doc?.value === 'string' ? doc.value : null;
};

const writeSettingValue = async (key: string, value: string): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo
    .collection<MongoTimestampedStringSettingDocument<string | ObjectId>>('settings')
    .updateOne(
      {
        $or: [{ _id: toMongoId(key) }, { key }],
      } as Filter<MongoTimestampedStringSettingDocument<string | ObjectId>>,
      {
        $set: {
          key,
          value,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: key,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
};

const deleteSettingByKey = async (key: string): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo
    .collection<MongoTimestampedStringSettingDocument<string | ObjectId>>('settings')
    .deleteMany({
      $or: [{ _id: toMongoId(key) }, { key }],
    } as Filter<MongoTimestampedStringSettingDocument<string | ObjectId>>);
};

const listSettingValuesByPrefix = async (prefix: string, take: number): Promise<string[]> => {
  const safeTake = Math.max(1, take);
