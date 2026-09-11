# Appwrite Referrals Collection Schema

## Collection ID
`referrals` (or set via `NEXT_PUBLIC_REFERRALS_COLLECTION_ID` env var)

## Database ID
Set via `NEXT_PUBLIC_APPWRITE_DATABASE_ID` env var

## Attributes

| Field | Type | Required | Indexed | Unique | Description |
|-------|------|----------|---------|--------|-------------|
| `referrerId` | string | Yes | Yes | No | The user ID of the referrer who sent the invite |
| `referredUserId` | string | Yes | Yes | Yes | The user ID of the referred user |
| `status` | string | Yes | No | No | Status of referral: 'PENDING' or 'VALID' |
| `phoneNumber` | string | No | No | No | Phone number of referred user (from safaricomPhoneNumber) |
| `hasDeposited` | boolean | Yes | No | No | Whether the referred user has made a deposit |
| `depositAmount` | number | Yes | No | No | Total deposit amount in KES |
| `createdAt` | string | Yes | No | No | ISO timestamp when referral was created |
| `completedAt` | string | No | No | No | ISO timestamp when referral became VALID |

## Indexes

1. **referrerId** - For querying all referrals by a specific referrer
2. **referredUserId** - For finding referral by referred user (unique constraint)

## Permissions

- **Read**: All users (public) or authenticated users only
- **Create**: Server-side only (via API routes)
- **Update**: Server-side only (via API routes)
- **Delete**: Server-side only (if needed)

## Status Flow

```
PENDING → VALID
```

- **PENDING**: User signed up via referral link but hasn't deposited yet
- **VALID**: User has deposited >= 1 KES (triggered in `/api/payment/status`)

## Usage Example

### Create Referral (on OAuth signup)
```javascript
await databases.createDocument(
  DATABASE_ID,
  REFERRALS_COLLECTION_ID,
  ID.unique(),
  {
    referrerId: "user_abc123",
    referredUserId: "user_xyz789",
    status: 'PENDING',
    phoneNumber: "+254712345678",
    hasDeposited: false,
    depositAmount: 0,
    createdAt: "2026-09-10T18:00:00.000Z",
    completedAt: null,
  }
);
```

### Validate Referral (on deposit)
```javascript
await databases.updateDocument(
  DATABASE_ID,
  REFERRALS_COLLECTION_ID,
  documentId,
  {
    status: 'VALID',
    hasDeposited: true,
    depositAmount: 5000,
    completedAt: "2026-09-10T18:30:00.000Z",
  }
);
```

### Query Referrals by Referrer
```javascript
const response = await databases.listDocuments(
  DATABASE_ID,
  REFERRALS_COLLECTION_ID,
  [Query.equal('referrerId', 'user_abc123')]
);
```

### Find Pending Referral by User
```javascript
const response = await databases.listDocuments(
  DATABASE_ID,
  REFERRALS_COLLECTION_ID,
  [
    Query.equal('referredUserId', 'user_xyz789'),
    Query.equal('status', 'PENDING')
  ]
);
```
