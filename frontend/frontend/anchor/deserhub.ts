/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/deserhub.json`.
 */
export type Deserhub = {
  address: "J4BSb2jYCnLsxAiaEeVktKfSjbAwUiDV8X5KzFhqkR2T";
  metadata: {
    name: "deserhub";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "createPaper";
      discriminator: [253, 23, 60, 237, 19, 181, 209, 113];
      accounts: [
        {
          name: "researcher";
          writable: true;
          signer: true;
        },
        {
          name: "paperEntry";
          writable: true;
          signer: true;
        },
        {
          name: "platform";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 108, 97, 116, 102, 111, 114, 109];
              },
              {
                kind: "account";
                path: "platform.admin";
                account: "platform";
              },
            ];
          };
        },
        {
          name: "treasury";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121];
              },
              {
                kind: "account";
                path: "platform";
              },
              {
                kind: "account";
                path: "platform.admin";
                account: "platform";
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "title";
          type: "string";
        },
        {
          name: "description";
          type: "string";
        },
        {
          name: "uri";
          type: "string";
        },
        {
          name: "isOpenAccess";
          type: "bool";
        },
        {
          name: "price";
          type: "u64";
        },
      ];
    },
    {
      name: "initialize";
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237];
      accounts: [
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "platform";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 108, 97, 116, 102, 111, 114, 109];
              },
              {
                kind: "account";
                path: "admin";
              },
            ];
          };
        },
        {
          name: "treasury";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121];
              },
              {
                kind: "account";
                path: "platform";
              },
              {
                kind: "account";
                path: "admin";
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "name";
          type: "string";
        },
        {
          name: "listingFeeBps";
          type: "u16";
        },
      ];
    },
    {
      name: "mintNft";
      discriminator: [211, 57, 6, 167, 15, 219, 35, 251];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
        },
        {
          name: "mint";
          writable: true;
          signer: true;
        },
        {
          name: "paperEntry";
        },
        {
          name: "paperAccessPass";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  97,
                  112,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  101,
                  115,
                  115,
                  95,
                  112,
                  97,
                  115,
                  115,
                ];
              },
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "account";
                path: "paperEntry";
              },
            ];
          };
        },
        {
          name: "ownerAta";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: "account";
                path: "mint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "metadata";
          writable: true;
        },
        {
          name: "masterEdition";
          writable: true;
        },
        {
          name: "platform";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 108, 97, 116, 102, 111, 114, 109];
              },
              {
                kind: "account";
                path: "platform.admin";
                account: "platform";
              },
            ];
          };
        },
        {
          name: "tokenMetadataProgram";
          address: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "tokenProgram";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "rent";
          address: "SysvarRent111111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "name";
          type: "string";
        },
        {
          name: "symbol";
          type: "string";
        },
        {
          name: "uri";
          type: "string";
        },
      ];
    },
    {
      name: "payPass";
      discriminator: [66, 183, 28, 109, 231, 55, 33, 114];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
        },
        {
          name: "paperEntry";
        },
        {
          name: "paperAccessPass";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  97,
                  112,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  101,
                  115,
                  115,
                  95,
                  112,
                  97,
                  115,
                  115,
                ];
              },
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "account";
                path: "paperEntry";
              },
            ];
          };
        },
        {
          name: "platform";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 108, 97, 116, 102, 111, 114, 109];
              },
              {
                kind: "account";
                path: "platform.admin";
                account: "platform";
              },
            ];
          };
        },
        {
          name: "researcher";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "withdraw";
      discriminator: [183, 18, 70, 156, 148, 109, 161, 34];
      accounts: [
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "platform";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 108, 97, 116, 102, 111, 114, 109];
              },
              {
                kind: "account";
                path: "admin";
              },
            ];
          };
        },
        {
          name: "treasury";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121];
              },
              {
                kind: "account";
                path: "platform";
              },
              {
                kind: "account";
                path: "admin";
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        },
      ];
    },
  ];
  accounts: [
    {
      name: "paperAccessPass";
      discriminator: [214, 88, 255, 129, 106, 66, 106, 82];
    },
    {
      name: "paperEntry";
      discriminator: [243, 180, 61, 147, 142, 246, 33, 170];
    },
    {
      name: "platform";
      discriminator: [77, 92, 204, 58, 187, 98, 91, 12];
    },
  ];
  events: [
    {
      name: "paperAccessPassCreated";
      discriminator: [154, 65, 129, 107, 250, 190, 223, 111];
    },
    {
      name: "paperCreated";
      discriminator: [131, 209, 45, 66, 111, 125, 102, 189];
    },
    {
      name: "platformInitialized";
      discriminator: [16, 222, 212, 5, 213, 140, 112, 162];
    },
  ];
  errors: [
    {
      code: 6000;
      name: "invalidNameLength";
      msg: "Invalid name length";
    },
    {
      code: 6001;
      name: "invalidListingFee";
      msg: "Invalid listing fee";
    },
    {
      code: 6002;
      name: "emptyTitle";
      msg: "Title is empty";
    },
    {
      code: 6003;
      name: "emptyDescription";
      msg: "Description is empty";
    },
    {
      code: 6004;
      name: "emptyUri";
      msg: "Uri is empty";
    },
    {
      code: 6005;
      name: "invalidPrice";
      msg: "Invalid price";
    },
    {
      code: 6006;
      name: "titleTooLong";
      msg: "Title is too long";
    },
    {
      code: 6007;
      name: "descriptionTooLong";
      msg: "Description is too long";
    },
    {
      code: 6008;
      name: "uriTooLongOrNull";
      msg: "Uri is too long or null";
    },
    {
      code: 6009;
      name: "insufficientBalanceForListing";
      msg: "Insufficient balance for listing";
    },
    {
      code: 6010;
      name: "payPassInvalidResearcher";
      msg: "The provided researcher is not the author of the paper";
    },
    {
      code: 6011;
      name: "invalidOwnerForCreateNft";
      msg: "Signer is not the owner of the paper access pass";
    },
    {
      code: 6012;
      name: "nftAlreadyMintedToPaperAccessPass";
      msg: "Paper access pass already has a minted NFT";
    },
    {
      code: 6013;
      name: "arithmeticOverflow";
      msg: "The arithmetic operation resulted in an overflow.";
    },
    {
      code: 6014;
      name: "insufficientBalanceForWithdraw";
      msg: "Insufficient balance for withdraw";
    },
    {
      code: 6015;
      name: "withdrawalBelowMinimumThreshold";
      msg: "Withdrawal amount or resulting treasury balance would be below 50 SOL minimum";
    },
  ];
  types: [
    {
      name: "paperAccessPass";
      type: {
        kind: "struct";
        fields: [
          {
            name: "mint";
            type: {
              option: "pubkey";
            };
          },
          {
            name: "paperEntry";
            type: "pubkey";
          },
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "price";
            type: "u64";
          },
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "purchasedAt";
            type: "i64";
          },
        ];
      };
    },
    {
      name: "paperAccessPassCreated";
      type: {
        kind: "struct";
        fields: [
          {
            name: "paperEntry";
            type: "pubkey";
          },
          {
            name: "paperAccessPass";
            type: "pubkey";
          },
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "price";
            type: "u64";
          },
          {
            name: "purchasedAt";
            type: "i64";
          },
        ];
      };
    },
    {
      name: "paperCreated";
      type: {
        kind: "struct";
        fields: [
          {
            name: "researcher";
            type: "pubkey";
          },
          {
            name: "paperEntry";
            type: "pubkey";
          },
          {
            name: "title";
            type: "string";
          },
          {
            name: "isOpenAccess";
            type: "bool";
          },
          {
            name: "price";
            type: "u64";
          },
        ];
      };
    },
    {
      name: "paperEntry";
      type: {
        kind: "struct";
        fields: [
          {
            name: "researcher";
            type: "pubkey";
          },
          {
            name: "title";
            type: "string";
          },
          {
            name: "description";
            type: "string";
          },
          {
            name: "uri";
            type: "string";
          },
          {
            name: "price";
            type: "u64";
          },
          {
            name: "isOpenAccess";
            type: "bool";
          },
          {
            name: "createdAt";
            type: "i64";
          },
        ];
      };
    },
    {
      name: "platform";
      type: {
        kind: "struct";
        fields: [
          {
            name: "admin";
            type: "pubkey";
          },
          {
            name: "listingFeeBps";
            type: "u16";
          },
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "treasuryBump";
            type: "u8";
          },
          {
            name: "name";
            type: "string";
          },
          {
            name: "nftCounter";
            type: "u64";
          },
        ];
      };
    },
    {
      name: "platformInitialized";
      type: {
        kind: "struct";
        fields: [
          {
            name: "name";
            type: "string";
          },
          {
            name: "listingFeeBps";
            type: "u16";
          },
        ];
      };
    },
  ];
};
