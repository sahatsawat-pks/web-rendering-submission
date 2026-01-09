import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manage Test Cases - ITCS255 Admin',
  description: 'Manage SQL query test cases for ITCS255 Database labs',
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
