import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manage Test Cases - ITCS251 Admin',
  description: 'Manage input/output test cases for ITCS251 Python labs',
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
