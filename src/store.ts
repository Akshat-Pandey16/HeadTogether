import { atom } from "jotai";
import { Storage } from "./types/storage";
export const storageAtom = atom<Storage | null>(null);


